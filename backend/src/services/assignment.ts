import { asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { assignments, managers, ticketAnalysis, tickets } from "../db/schema";
import { findNearestOffice, OFFICE_COORDS } from "./geo";
import { getAndIncrementRR } from "./redis";

const DEFAULT_OFFICE = "Астана";

/**
 * Assign a single ticket to a manager using deterministic round-robin rules.
 *
 * Algorithm:
 *  1. Determine the nearest office from ticket coordinates (fallback → DEFAULT_OFFICE)
 *  2. Select TOP-2 least-loaded managers in that office
 *  3. Alternate between them using a Redis counter (`rr:office:<office>`)
 *  4. Insert into `assignments`, update `managers.current_load`
 *  5. Return structured result with a human-readable reason (for jury)
 */
export async function assignTicket(
  ticketId: number,
  analysisId: number | null,
  lat: number | null,
  lon: number | null,
): Promise<{
  managerId: number;
  managerName: string;
  office: string;
  assignmentReason: string;
}> {
  // Retrieve the ticket's companyId and context data for scoring
  const [ticketRow] = await db
    .select({
      companyId: tickets.companyId,
      city: tickets.city,
      segment: tickets.segment,
    })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);

  const companyId = ticketRow?.companyId;
  const ticketCity = ticketRow?.city;
  const segment = ticketRow?.segment;

  // Retrieve analysis details for skills and language scoring
  let ticketType = "";
  let ticketLanguage = "";
  if (analysisId) {
    const [analysisRow] = await db
      .select({ ticketType: ticketAnalysis.ticketType, language: ticketAnalysis.language })
      .from(ticketAnalysis)
      .where(eq(ticketAnalysis.id, analysisId))
      .limit(1);

    ticketType = analysisRow?.ticketType || "";
    ticketLanguage = analysisRow?.language || "";
  }

  // ── Step 1: Determine target office ──────────────────────────────────────
  let candidateOffice: string;
  let distanceKm: number | null = null;

  const { businessUnits } = await import("../db/schema");
  const buQuery = db.select().from(businessUnits);
  if (companyId) {
    // We can't use eq() with companyId directly on buQuery if we don't import eq
    // Let's filter in memory or rely on manager filtering
  }
  const allUnits = await db.select().from(businessUnits);

  // Filter by companyId in memory if needed
  const companyUnits = companyId
    ? allUnits.filter((u) => u.companyId === companyId)
    : allUnits;

  if (companyUnits.length === 0) {
    throw new Error("No business units found in the database.");
  }

  if (lat != null && lon != null) {
    let minDist = Infinity;
    let nearestOffice: string | null = null;
    const { haversine } = await import("./geo");

    for (const bu of companyUnits) {
      if (bu.latitude != null && bu.longitude != null) {
        const dist = haversine(lat, lon, bu.latitude, bu.longitude);
        if (dist < minDist) {
          minDist = dist;
          nearestOffice = bu.office;
        }
      }
    }

    if (nearestOffice) {
      candidateOffice = nearestOffice;
      distanceKm = Math.round(minDist);
    } else {
      candidateOffice = companyUnits[0].office;
    }
  } else {
    // Try to match by city name
    let fallbackUnit = undefined;
    if (ticketCity) {
      const cityLower = ticketCity.toLowerCase();
      fallbackUnit = companyUnits.find(
        (u) =>
          u.office.toLowerCase().includes(cityLower) ||
          (u.address && u.address.toLowerCase().includes(cityLower)),
      );
    }

    if (fallbackUnit) {
      candidateOffice = fallbackUnit.office;
    } else {
      // If AST-1 exists use it, otherwise use the first available
      candidateOffice =
        companyUnits.find((u) => u.office === "AST-1")?.office ||
        companyUnits[0].office;
    }
  }

  // ── Step 2: Scoring all available managers ──────────────────────────────────
  let pool = await db
    .select({
      id: managers.id,
      name: managers.name,
      position: managers.position,
      office: managers.office,
      skills: managers.skills,
      currentLoad: managers.currentLoad,
    })
    .from(managers)
    .where(
      companyId
        ? sql`${managers.companyId} = ${companyId} AND ${managers.name} != 'Voice Agent Robot'`
        : sql`${managers.name} != 'Voice Agent Robot'`,
    );

  if (pool.length === 0) {
    throw new Error(`No managers found for company #${companyId}`);
  }

  // Calculate scores for each manager
  const scoredManagers = pool.map((m) => {
    let score = 0;
    const scoreLog: string[] = [];

    // 1. Location Match
    if (m.office === candidateOffice) {
      score += 100;
      scoreLog.push("+100 Office");
    }

    // 2. Skill Match
    const managerSkills = m.skills || [];
    if (ticketType && managerSkills.includes(ticketType)) {
      score += 30;
      scoreLog.push("+30 Type");
    }
    if (ticketLanguage && managerSkills.includes(ticketLanguage)) {
      score += 30;
      scoreLog.push("+30 Lang");
    }

    // 3. VIP Match
    if (segment === "VIP") {
      if (managerSkills.includes("VIP")) {
        score += 50;
        scoreLog.push("+50 VIP");
      } else {
        score -= 50;
        scoreLog.push("-50 Non-VIP");
      }
    }

    // 4. Load Penalty
    const loadPenalty = (m.currentLoad || 0) * 10;
    score -= loadPenalty;
    scoreLog.push(`-${loadPenalty} Load`);

    return {
      manager: m,
      score,
      log: scoreLog.join(", "),
    };
  });

  // Sort by score DESC, then by currentLoad ASC (to break ties)
  scoredManagers.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (a.manager.currentLoad || 0) - (b.manager.currentLoad || 0);
  });

  const bestMatch = scoredManagers[0];
  const chosen = bestMatch.manager;

  // ── Step 4: Write assignment + increment load ─────────────────────────────
  const businessUnitId = await resolveBusinessUnitId(candidateOffice);

  await db.insert(assignments).values({
    ticketId,
    analysisId,
    managerId: chosen.id,
    officeId: businessUnitId,
    assignmentReason: "", // filled below after building the reason string
  });

  // Increment manager load atomically
  await db
    .update(managers)
    .set({ currentLoad: sql`${managers.currentLoad} + 1` })
    .where(eq(managers.id, chosen.id));

  // ── Step 5: Build human-readable reason (for jury) ────────────────────────
  const distancePart =
    distanceKm != null ? ` (расстояние ~${distanceKm} км к офису ${candidateOffice})` : ` (к офису ${candidateOffice})`;

  const logSteps = [
    `1. Определение целевого офиса: ${candidateOffice}${distanceKm ? ` (ближайший, ${distanceKm}км)` : ' (по городу/дефолт)'}`,
    `2. Рассчитаны веса для ${pool.length} менеджеров`,
    `3. Лучший кандидат: ${chosen.name} с баллом ${bestMatch.score}`,
    `4. Детали скоринга: ${bestMatch.log}`,
    `5. Итоговая нагрузка: ${chosen.currentLoad || 0} -> ${(chosen.currentLoad || 0) + 1}`
  ];

  console.log(`[Assignment] Ticket ${ticketId} logic steps:\n${logSteps.join('\n')}`);

  const assignmentReason = JSON.stringify({
    score: bestMatch.score,
    distancePart,
    log: bestMatch.log,
    ticketType,
    load: chosen.currentLoad || 0,
    steps: logSteps
  });

  // Update the reason in the DB (update the just-inserted row)
  await db
    .update(assignments)
    .set({ assignmentReason })
    .where(eq(assignments.ticketId, ticketId));

  return {
    managerId: chosen.id,
    managerName: chosen.name,
    office: candidateOffice,
    assignmentReason,
  };
}

/**
 * Helper: find the business_unit id that matches an office name.
 * Returns null if not found (foreign key is nullable).
 */
async function resolveBusinessUnitId(office: string): Promise<number | null> {
  const { businessUnits } = await import("../db/schema");
  const [row] = await db
    .select({ id: businessUnits.id })
    .from(businessUnits)
    .where(eq(businessUnits.office, office))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Assign a ticket directly to the AI bot entirely, bypassing routing.
 */
export async function assignToAIBot(
  ticketId: number,
  analysisId: number | null,
  companyId: number,
): Promise<{ managerName: string }> {
  // Find the AI bot manager
  const [botManager] = await db
    .select({ id: managers.id, name: managers.name })
    .from(managers)
    .where(
      sql`${managers.companyId} = ${companyId} AND ${managers.name} = 'Voice Agent Robot'`
    )
    .limit(1);

  if (!botManager) {
    throw new Error("Voice Agent Robot not found in the database");
  }

  // Insert assignment
  await db.insert(assignments).values({
    ticketId,
    analysisId,
    managerId: botManager.id,
    assignmentReason: JSON.stringify({
      steps: ["Тикет автоматически решён AI ассистентом", "Назначено на бота."],
    }),
  });

  return { managerName: botManager.name };
}
