/**
 * Batch processing service — finds unanalyzed tickets and queues them.
 */

import { db } from "../db";
import { tickets, ticketAnalysis } from "../db/schema";
import { eq, isNull, sql } from "drizzle-orm";
import { normalizeTicket } from "./normalize";
import { enqueueTickets } from "./queue";

export { assignTicket } from "../services/assignment";

/**
 * Find all tickets that have no analysis record yet and enqueue them.
 */
export async function processAllTickets(): Promise<{
  count: number;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Find tickets without analysis
    const unprocessed = await db
      .select({
        id: tickets.id,
        companyId: tickets.companyId,
        guid: tickets.guid,
        gender: tickets.gender,
        birthDate: tickets.birthDate,
        segment: tickets.segment,
        description: tickets.description,
        country: tickets.country,
        city: tickets.city,
        street: tickets.street,
        house: tickets.house,
        source: tickets.source,
      })
      .from(tickets)
      .leftJoin(ticketAnalysis, eq(ticketAnalysis.ticketId, tickets.id))
      .where(isNull(ticketAnalysis.id));

    if (unprocessed.length === 0) {
      return { count: 0, errors: [] };
    }

    console.log(`[Processing] Found ${unprocessed.length} unanalyzed tickets`);

    const unified = unprocessed.map((row) =>
      normalizeTicket(
        (row.source as any) || "csv",
        {
          guid: row.guid,
          gender: row.gender,
          birthDate: row.birthDate,
          segment: row.segment,
          description: row.description || "",
          country: row.country,
          city: row.city,
          street: row.street,
          house: row.house,
        },
        row.companyId as number,
      ),
    );

    await enqueueTickets(unified);

    console.log(`[Processing] Enqueued ${unified.length} tickets for analysis`);
    return { count: unified.length, errors };
  } catch (e) {
    const msg = `processAllTickets error: ${String(e)}`;
    console.error(msg);
    errors.push(msg);
    return { count: 0, errors };
  }
}
