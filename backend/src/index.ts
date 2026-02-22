import { cookie } from "@elysiajs/cookie";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { initDb } from "./db";
import { config } from "./lib/config";
import { assignmentsRoutes } from "./routes/assignments";
import { authRoutes } from "./routes/auth";
import { businessUnitsRoutes } from "./routes/business-units";
import { dataLoaderRoutes } from "./routes/data-loader";
import { ingestRoutes } from "./routes/ingest";
import { managersRoutes } from "./routes/managers";
import { starTaskRoutes } from "./routes/star-task";
import { statsRoutes as baseStatsRoutes } from "./routes/stats";
import { ticketsRoutes as baseTicketsRoutes } from "./routes/tickets";
import { ensureBucket } from "./services/minio";

// Ensure Database & migrations are ready
await initDb();

// Ensure MinIO bucket exists on startup
await ensureBucket();

const app = new Elysia()
  .use(cors({ origin: true, credentials: true }))
  .use(swagger({ path: "/docs" }))
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super-secret-key-change-me",
    }),
  )
  .use(cookie())
  .derive(async ({ jwt, cookie: { auth_token } }) => {
    if (!auth_token?.value) return { user: null };
    const payload = await jwt.verify(auth_token.value as string);
    return { user: payload };
  })
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .use(authRoutes)
  .use(dataLoaderRoutes)
  .use(ingestRoutes)
  .group("/api", (api) =>
    api
      .onBeforeHandle(({ user, set }) => {
        if (!user) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
      })
      .use(baseTicketsRoutes)
      .use(assignmentsRoutes)
      .use(managersRoutes)
      .use(baseStatsRoutes)
      .use(businessUnitsRoutes),
  )
  .use(starTaskRoutes)
  .listen(config.port);

console.log(`🔥 FIRE API running on http://localhost:${config.port}`);
console.log(`📖 Swagger: http://localhost:${config.port}/docs`);

import { handleTicketAnalysis } from "./jobs/analysis.worker";
// ── Start analysis workers ──────────────────────────────────────────────────
import { startWorkers } from "./services/queue";

startWorkers(3, handleTicketAnalysis);
console.log("🤖 Analysis workers started (concurrency: 3)");
