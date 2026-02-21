import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { config } from "./lib/config";
import { assignmentsRoutes } from "./routes/assignments";
import { authRoutes } from "./routes/auth";
import { dataLoaderRoutes } from "./routes/data-loader";
import { managersRoutes } from "./routes/managers";
import { starTaskRoutes } from "./routes/star-task";
import { statsRoutes as baseStatsRoutes } from "./routes/stats";
import { ticketsRoutes as baseTicketsRoutes } from "./routes/tickets";
import { businessUnitsRoutes } from "./routes/business-units";
import { ensureBucket } from "./services/minio";
import { initDb } from "./db";
import { jwt } from "@elysiajs/jwt";
import { cookie } from "@elysiajs/cookie";

// Ensure Database & migrations are ready
await initDb();

// Ensure MinIO bucket exists on startup
await ensureBucket();

const app = new Elysia()
  .use(cors({ origin: ["http://localhost:3000"] }))
  .use(swagger({ path: "/docs" }))
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super-secret-key-change-me",
    })
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
      .use(businessUnitsRoutes)
  )
  .use(starTaskRoutes)
  .listen(config.port);

console.log(`🔥 FIRE API running on http://localhost:${config.port}`);
console.log(`📖 Swagger: http://localhost:${config.port}/docs`);
