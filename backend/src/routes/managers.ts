import { asc, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../db";
import { managers } from "../db/schema";

export const managersRoutes = new Elysia({ prefix: "/managers" })

  // GET /managers — all managers ordered by current load
  .get("/", async ({ user }) => {
    const rows = await db
      .select()
      .from(managers)
      .where(eq(managers.companyId, (user as any).companyId))
      .orderBy(asc(managers.currentLoad));

    return rows;
  });
