import { asc } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../db";
import { managers } from "../db/schema";

export const managersRoutes = new Elysia({ prefix: "/managers" })

  // GET /managers — all managers ordered by current load
  .get("/", async () => {
    const rows = await db
      .select()
      .from(managers)
      .orderBy(asc(managers.currentLoad));

    return rows;
  });
