import { sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../db";
import { cacheStats, getCachedStats } from "../services/redis";

export const statsRoutes = new Elysia({ prefix: "/stats" }).get(
  "/",
  async ({ user }) => {
    const companyId = (user as any).companyId;
    // Check Redis cache first (TTL 60 sec)
    // We should include companyId in cache key
    const cacheKey = `stats_${companyId}`;
    const cached = await getCachedStats(cacheKey);
    if (cached) return cached;

    const [totals] = await db.execute(sql`
      SELECT
        COUNT(DISTINCT t.id)                                                AS total_tickets,
        ROUND(AVG(ta.priority)::numeric, 1)                                 AS avg_priority,
        COUNT(DISTINCT t.id) FILTER (WHERE ta.sentiment = 'Негативный')     AS negative_count,
        COUNT(DISTINCT t.id) FILTER (WHERE t.segment IN ('VIP','Priority')) AS vip_count
      FROM tickets t
      LEFT JOIN ticket_analysis ta ON ta.ticket_id = t.id
      WHERE t.company_id = ${companyId}
    `);

    const byType = await db.execute(sql`
      SELECT ta.ticket_type AS name, COUNT(*) AS count
      FROM ticket_analysis ta
      JOIN tickets t ON t.id = ta.ticket_id
      WHERE t.company_id = ${companyId}
      GROUP BY ta.ticket_type ORDER BY count DESC
    `);

    const bySentiment = await db.execute(sql`
      SELECT ta.sentiment AS name, COUNT(*) AS count
      FROM ticket_analysis ta
      JOIN tickets t ON t.id = ta.ticket_id
      WHERE t.company_id = ${companyId}
      GROUP BY ta.sentiment
    `);

    const byOffice = await db.execute(sql`
      SELECT m.office AS name, COUNT(*) AS count
      FROM assignments a
      JOIN managers m ON m.id = a.manager_id
      WHERE m.company_id = ${companyId}
      GROUP BY m.office ORDER BY count DESC
    `);

    const bySegment = await db.execute(sql`
      SELECT segment AS name, COUNT(*) AS count
      FROM tickets
      WHERE company_id = ${companyId}
      GROUP BY segment
    `);

    const managerLoads = await db.execute(sql`
      SELECT name, office, current_load AS load, position
      FROM managers
      WHERE company_id = ${companyId}
      ORDER BY current_load DESC
      LIMIT 20
    `);

    const stats = {
      totals,
      byType,
      bySentiment,
      byOffice,
      bySegment,
      managerLoads,
    };
    await cacheStats(stats, cacheKey);
    return stats;
  },
);
