import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { cookie } from "@elysiajs/cookie";
import { normalizeTicket, type TicketSource } from "../services/normalize";
import { enqueueTicket, enqueueTickets, getQueueLength } from "../services/queue";
import { v4 as uuidv4 } from "uuid";

/**
 * Universal ingest endpoint — accepts tickets from ANY channel.
 *
 * POST /api/ingest       — single ticket
 * POST /api/ingest/batch — array of tickets
 * GET  /api/ingest/queue — queue stats
 */
export const ingestRoutes = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super-secret-key-change-me",
    }),
  )
  .use(cookie())
  .group("/api/ingest", (app) =>
    app
      .derive(async ({ jwt, cookie: { auth_token } }) => {
        if (!auth_token || !auth_token.value) return { user: null };
        const payload = await jwt.verify(auth_token.value as string);
        return { user: payload };
      })

      // ── Single ticket ─────────────────────────────────────────────────
      .post(
        "/",
        async ({ body, user, set }) => {
          if (!user) {
            set.status = 401;
            return { error: "Unauthorized" };
          }

          const { source, payload } = body;
          const companyId = user.companyId as number;

          try {
            const unified = normalizeTicket(
              source as TicketSource,
              payload,
              companyId,
            );

            // Ensure guid exists
            if (!unified.guid) {
              unified.guid = `${source}-${Date.now()}-${uuidv4().slice(0, 8)}`;
            }

            await enqueueTicket(unified);

            return {
              success: true,
              message: `Ticket queued for analysis`,
              guid: unified.guid,
              source: unified.source,
            };
          } catch (err) {
            console.error("[Ingest] Error:", err);
            set.status = 500;
            return { error: "Failed to enqueue ticket: " + String(err) };
          }
        },
        {
          body: t.Object({
            source: t.Union([
              t.Literal("voice"),
              t.Literal("csv"),
              t.Literal("json"),
              t.Literal("chat"),
            ]),
            payload: t.Any(),
          }),
        },
      )

      // ── Batch ─────────────────────────────────────────────────────────
      .post(
        "/batch",
        async ({ body, user, set }) => {
          if (!user) {
            set.status = 401;
            return { error: "Unauthorized" };
          }

          const { source, items } = body;
          const companyId = user.companyId as number;

          try {
            const unified = items.map((item: any) => {
              const ticket = normalizeTicket(
                source as TicketSource,
                item,
                companyId,
              );
              if (!ticket.guid) {
                ticket.guid = `${source}-${Date.now()}-${uuidv4().slice(0, 8)}`;
              }
              return ticket;
            });

            await enqueueTickets(unified);

            return {
              success: true,
              count: unified.length,
              message: `${unified.length} tickets queued for analysis`,
            };
          } catch (err) {
            console.error("[Ingest] Batch error:", err);
            set.status = 500;
            return { error: "Failed to enqueue batch: " + String(err) };
          }
        },
        {
          body: t.Object({
            source: t.Union([
              t.Literal("voice"),
              t.Literal("csv"),
              t.Literal("json"),
              t.Literal("chat"),
            ]),
            items: t.Array(t.Any()),
          }),
        },
      )

      // ── Queue stats ───────────────────────────────────────────────────
      .get("/queue", async ({ user, set }) => {
        if (!user) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
        const length = await getQueueLength();
        return { queueLength: length };
      }),
  );
