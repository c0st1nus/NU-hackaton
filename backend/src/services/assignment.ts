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
  // ── Step 1: Determine target office ──────────────────────────────────────
  let office: string;
  let distanceKm: number | null = null;

  if (lat != null && lon != null) {
    office = findNearestOffice(lat, lon);
    // Calculate the actual distance for the reason string
    const officeCoords = OFFICE_COORDS[office];
    if (officeCoords) {
      const { haversine } = await import("./geo");
      distanceKm = Math.round(
        haversine(lat, lon, officeCoords[0], officeCoords[1]),
      );
    }
  } else {
    office = DEFAULT_OFFICE;
  }

  // ── Step 2: TOP-2 least-loaded managers in that office ───────────────────
  const topManagers = await db
    .select({
      id: managers.id,
      name: managers.name,
      position: managers.position,
      currentLoad: managers.currentLoad,
    })
    .from(managers)
    .where(eq(managers.office, office))
    .orderBy(asc(managers.currentLoad))
    .limit(2);

  // If the target office has no managers, try the default office as a fallback
  let candidateOffice = office;
  let pool = topManagers;
  if (pool.length === 0) {
    candidateOffice = DEFAULT_OFFICE;
    pool = await db
      .select({
        id: managers.id,
        name: managers.name,
        position: managers.position,
        currentLoad: managers.currentLoad,
      })
      .from(managers)
      .where(eq(managers.office, candidateOffice))
      .orderBy(asc(managers.currentLoad))
      .limit(2);
  }

  if (pool.length === 0) {
    throw new Error(`No managers found in office "${candidateOffice}"`);
  }

  // ── Step 3: Round-Robin selection ─────────────────────────────────────────
  const rrKey = `office:${candidateOffice}`;
  const counter = await getAndIncrementRR(rrKey);
  const pickedIndex = counter % pool.length; // 0 or 1 (or 0 if only 1 manager)
  const chosen = pool[pickedIndex];

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
    distanceKm != null
      ? ` (расстояние ~${distanceKm} км)`
      : office !== candidateOffice
        ? ` (fallback из ${office})`
        : "";

  const poolDesc = pool
    .map(
      (m, i) =>
        `${m.name} (${m.currentLoad} тик.)${i === pickedIndex ? " ← выбран" : ""}`,
    )
    .join(" vs ");

  const assignmentReason =
    `Офис: ${candidateOffice}${distancePart}. ` +
    `Round Robin среди топ-${pool.length} наименее загруженных: ${poolDesc}. ` +
    `Счётчик RR=${counter} → индекс ${pickedIndex}.`;

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
