/**
 * Lightweight Redis-based job queue for ticket analysis.
 *
 * Uses LPUSH / BRPOP pattern — works natively with Bun + ioredis.
 * No BullMQ dependency required.
 */

import Redis from "ioredis";
import { config } from "../lib/config";
import type { UnifiedTicket } from "./normalize";

const QUEUE_KEY = "queue:ticket-analysis";

// Dedicated connections for queue operations (BRPOP blocks the connection)
let publisher: Redis | null = null;

function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis({ host: config.redis.host, port: config.redis.port });
  }
  return publisher;
}

// ─── Enqueue ──────────────────────────────────────────────────────────────────

export async function enqueueTicket(ticket: UnifiedTicket): Promise<void> {
  await getPublisher().lpush(QUEUE_KEY, JSON.stringify(ticket));
}

export async function enqueueTickets(tickets: UnifiedTicket[]): Promise<void> {
  if (tickets.length === 0) return;
  const pipeline = getPublisher().pipeline();
  for (const ticket of tickets) {
    pipeline.lpush(QUEUE_KEY, JSON.stringify(ticket));
  }
  await pipeline.exec();
}

// ─── Queue stats ──────────────────────────────────────────────────────────────

export async function getQueueLength(): Promise<number> {
  return getPublisher().llen(QUEUE_KEY);
}

// ─── Worker loop ──────────────────────────────────────────────────────────────

type JobHandler = (ticket: UnifiedTicket) => Promise<void>;

let workersRunning = false;

export function startWorkers(
  concurrency: number,
  handler: JobHandler,
): void {
  if (workersRunning) {
    console.warn("[Queue] Workers already running, skipping duplicate start");
    return;
  }
  workersRunning = true;

  console.log(
    `[Queue] Starting ${concurrency} analysis workers on "${QUEUE_KEY}"`,
  );

  for (let i = 0; i < concurrency; i++) {
    spawnWorker(i, handler);
  }
}

async function spawnWorker(id: number, handler: JobHandler): Promise<void> {
  // Each worker gets its own Redis connection (BRPOP is blocking)
  const conn = new Redis({ host: config.redis.host, port: config.redis.port });

  console.log(`[Worker-${id}] Listening…`);

  while (workersRunning) {
    try {
      // BRPOP blocks until a job is available (timeout 5s then re-loop for graceful shutdown)
      const result = await conn.brpop(QUEUE_KEY, 5);
      if (!result) continue; // timeout, loop again

      const [, payload] = result;
      const ticket: UnifiedTicket = JSON.parse(payload);

      try {
        await handler(ticket);
      } catch (err) {
        console.error(
          `[Worker-${id}] Handler error for ticket "${ticket.guid || "unknown"}":`,
          err,
        );

        // Simple retry: push back to queue (max 1 retry via meta flag)
        if (!ticket.meta.__retried) {
          ticket.meta.__retried = true;
          await getPublisher().lpush(QUEUE_KEY, JSON.stringify(ticket));
          console.log(`[Worker-${id}] Re-queued for retry`);
        }
      }
    } catch (err) {
      console.error(`[Worker-${id}] BRPOP error:`, err);
      // Brief pause before reconnecting
      await Bun.sleep(1000);
    }
  }

  conn.disconnect();
}

export function stopWorkers(): void {
  workersRunning = false;
}
