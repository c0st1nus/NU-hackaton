/**
 * STUB — implemented by the AI-dev teammate.
 *
 * This file must export `processAllTickets()` which:
 *  1. Reads unprocessed tickets from DB
 *  2. Runs AI analysis (ticket_type, sentiment, priority, language, summary, recommendation)
 *  3. Calls `assignTicket()` from '../services/assignment' for each ticket
 *  4. Returns total count and any errors
 *
 * The `assignTicket` export below is re-exported so teammate can import it conveniently.
 */

export { assignTicket } from "../services/assignment";

export async function processAllTickets(): Promise<{
  count: number;
  errors: string[];
}> {
  // TODO: teammate implements this
  console.warn("processAllTickets() stub — teammate implementation pending");
  return { count: 0, errors: ["Processing service not yet implemented"] };
}
