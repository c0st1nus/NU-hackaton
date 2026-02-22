/**
 * Analysis Worker — processes one UnifiedTicket at a time.
 *
 * Pipeline:
 *  1. LLM analysis (ticket_type, sentiment, priority, language, summary, recommendation)
 *  2. Geocoding (country + city + street → lat/lon)
 *  3. Save ticket + analysis to DB
 *  4. Assign to manager via round-robin
 *  5. Invalidate stats cache
 */

import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { ticketAnalysis, tickets } from "../db/schema";
import { config } from "../lib/config";
import { prompts } from "../lib/prompts";
import { assignTicket } from "../services/assignment";
import { geocodeAddress } from "../services/geo";
import type { ImageAttachment, UnifiedTicket } from "../services/normalize";
import { invalidateStatsCache } from "../services/redis";

// ─── LLM Analysis ─────────────────────────────────────────────────────────────

interface LlmAnalysisResult {
  ticketType: string;
  sentiment: string;
  priority: number;
  language: string;
  summary: string;
  recommendation: string;
}

/**
 * Build the OpenAI-compatible `content` field for the user message.
 * If images are present, returns a multimodal content array.
 * Otherwise returns plain text string.
 */
function buildUserContent(
  text: string,
  images?: ImageAttachment[],
): string | Array<Record<string, unknown>> {
  if (!images || images.length === 0) {
    return text;
  }

  const parts: Array<Record<string, unknown>> = [{ type: "text", text }];

  for (const img of images) {
    if (img.type === "url") {
      parts.push({
        type: "image_url",
        image_url: { url: img.data },
      });
    } else {
      // base64
      const mime = img.mimeType || "image/jpeg";
      parts.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${img.data}` },
      });
    }
  }

  return parts;
}

async function analyzeWithLlm(
  text: string,
  images?: ImageAttachment[],
): Promise<LlmAnalysisResult> {
  const userContent = buildUserContent(text, images);

  const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.model,
      messages: [
        { role: "system", content: prompts.analysis.system },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(`LLM error: ${data.error?.message || res.statusText}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty LLM response");

  return JSON.parse(content) as LlmAnalysisResult;
}

// ─── Main handler — called by queue worker for each ticket ────────────────────

export async function handleTicketAnalysis(
  unified: UnifiedTicket,
): Promise<void> {
  const startTime = Date.now();
  const ticketGuid = unified.guid || (unified.meta.guid as string) || "unknown";

  console.log(
    `[Analysis] Processing ticket "${ticketGuid}" (source: ${unified.source})`,
  );

  // 1. Check if ticket already exists in DB (for CSV/JSON imports it was pre-inserted)
  let ticketId: number;

  if (unified.guid) {
    const [existing] = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(
        and(
          eq(tickets.guid, unified.guid),
          eq(tickets.companyId, unified.companyId),
        ),
      )
      .limit(1);

    if (existing) {
      ticketId = existing.id;

      // Check if already analyzed
      const [existingAnalysis] = await db
        .select({ id: ticketAnalysis.id })
        .from(ticketAnalysis)
        .where(eq(ticketAnalysis.ticketId, ticketId))
        .limit(1);

      if (existingAnalysis) {
        console.log(
          `[Analysis] Ticket "${ticketGuid}" already analyzed, skipping`,
        );
        return;
      }
    } else {
      // Insert the ticket (voice / chat may not have been pre-inserted)
      const [inserted] = await db
        .insert(tickets)
        .values({
          companyId: unified.companyId,
          guid: unified.guid,
          gender: unified.gender || null,
          birthDate: unified.birthDate || null,
          segment: unified.segment || null,
          contact: unified.contact || null,
          description: unified.text,
          source: unified.source,
          status: unified.status || "Новый",
        })
        .returning({ id: tickets.id });
      ticketId = inserted.id;
    }
  } else {
    // No guid — generate one and insert
    const guid = `${unified.source}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const [inserted] = await db
      .insert(tickets)
      .values({
        companyId: unified.companyId,
        guid,
        gender: unified.gender || null,
        birthDate: unified.birthDate || null,
        segment: unified.segment || null,
        contact: unified.contact || null,
        description: unified.text,
        source: unified.source,
        status: unified.status || "Новый",
      })
      .returning({ id: tickets.id });
    ticketId = inserted.id;
  }

  // 2. LLM Analysis
  let analysis: LlmAnalysisResult;
  try {
    analysis = await analyzeWithLlm(unified.text, unified.images);
  } catch (err) {
    console.error(`[Analysis] LLM failed for "${ticketGuid}":`, err);
    // Insert a fallback analysis so we don't re-process
    analysis = {
      ticketType: "Консультация",
      sentiment: "Нейтральный",
      priority: 2,
      language: "RU",
      summary: unified.text.slice(0, 200),
      recommendation: "Требуется ручная проверка (LLM недоступен)",
    };
  }

  // 3. Save analysis to DB
  const [analysisRow] = await db
    .insert(ticketAnalysis)
    .values({
      ticketId,
      ticketType: analysis.ticketType,
      sentiment: analysis.sentiment,
      priority: analysis.priority,
      language: analysis.language,
      summary: analysis.summary,
      recommendation: analysis.recommendation,
    })
    .returning({ id: ticketAnalysis.id });

  // 4. Geocoding
  let lat: number | null = null;
  let lon: number | null = null;

  try {
    const coords = await geocodeAddress(
      unified.country || null,
      unified.city || null,
      unified.street || null,
      unified.house || null,
    );
    if (coords) {
      [lat, lon] = coords;
      // Update ticket with coordinates
      await db
        .update(tickets)
        .set({ latitude: lat, longitude: lon })
        .where(eq(tickets.id, ticketId));
    }
  } catch (err) {
    console.error(`[Analysis] Geocoding failed for "${ticketGuid}":`, err);
  }

  // 5. Assignment
  const currentStatus = unified.status || "Новый";
  if (currentStatus !== "Завершен") {
    // Normal routing
    try {
      const assignment = await assignTicket(ticketId, analysisRow.id, lat, lon);
      console.log(
        `[Analysis] Ticket "${ticketGuid}" → ${assignment.managerName} (${assignment.office})`,
      );
    } catch (err) {
      console.error(`[Analysis] Assignment failed for "${ticketGuid}":`, err);
    }
  } else {
    // Already resolved by AI - assign directly to AI bot
    try {
      const { assignToAIBot } = await import("../services/assignment");
      const assignment = await assignToAIBot(ticketId, analysisRow.id, unified.companyId);
      console.log(
        `[Analysis] Ticket "${ticketGuid}" already resolved by AI, assigned to: ${assignment.managerName}`,
      );
    } catch (err) {
      console.error(`[Analysis] AI Agent Assignment failed for "${ticketGuid}":`, err);
    }
  }

  // 6. Invalidate stats cache
  await invalidateStatsCache();

  const elapsed = Date.now() - startTime;
  console.log(`[Analysis] Done "${ticketGuid}" in ${elapsed}ms`);
}
