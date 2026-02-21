import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import {
  assignments,
  businessUnits,
  managers,
  ticketAnalysis,
  tickets,
} from "../db/schema";
import { invalidateStatsCache } from "../services/redis";

export const ticketsRoutes = new Elysia({ prefix: "/tickets" })

  // GET /tickets — list with filters
  .get(
    "/",
    async ({ query }) => {
      const {
        limit = "50",
        offset = "0",
        office,
        segment,
        ticket_type,
        sentiment,
        language,
      } = query;

      const rows = await db
        .select({
          id: tickets.id,
          guid: tickets.guid,
          segment: tickets.segment,
          description: tickets.description,
          city: tickets.city,
          latitude: tickets.latitude,
          longitude: tickets.longitude,
          source: tickets.source,
          createdAt: tickets.createdAt,
          // AI analysis
          ticketType: ticketAnalysis.ticketType,
          sentimentVal: ticketAnalysis.sentiment,
          priority: ticketAnalysis.priority,
          language: ticketAnalysis.language,
          summary: ticketAnalysis.summary,
          recommendation: ticketAnalysis.recommendation,
          // Assignment
          assignmentId: assignments.id,
          assignmentReason: assignments.assignmentReason,
          assignedAt: assignments.assignedAt,
          // Manager
          managerId: managers.id,
          managerName: managers.name,
          managerPosition: managers.position,
          managerOffice: managers.office,
          managerSkills: managers.skills,
          managerLoad: managers.currentLoad,
        })
        .from(tickets)
        .leftJoin(ticketAnalysis, eq(ticketAnalysis.ticketId, tickets.id))
        .leftJoin(assignments, eq(assignments.ticketId, tickets.id))
        .leftJoin(managers, eq(managers.id, assignments.managerId))
        .where(
          and(
            office ? eq(managers.office, office) : undefined,
            segment ? eq(tickets.segment, segment) : undefined,
            ticket_type
              ? eq(ticketAnalysis.ticketType, ticket_type)
              : undefined,
            sentiment ? eq(ticketAnalysis.sentiment, sentiment) : undefined,
            language ? eq(ticketAnalysis.language, language) : undefined,
          ),
        )
        .limit(Number(limit))
        .offset(Number(offset))
        .orderBy(assignments.assignedAt);

      return rows;
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
        office: t.Optional(t.String()),
        segment: t.Optional(t.String()),
        ticket_type: t.Optional(t.String()),
        sentiment: t.Optional(t.String()),
        language: t.Optional(t.String()),
      }),
    },
  )

  // GET /tickets/:id — detailed view
  .get("/:id", async ({ params, set }) => {
    const [row] = await db
      .select()
      .from(tickets)
      .leftJoin(ticketAnalysis, eq(ticketAnalysis.ticketId, tickets.id))
      .leftJoin(assignments, eq(assignments.ticketId, tickets.id))
      .leftJoin(managers, eq(managers.id, assignments.managerId))
      .leftJoin(businessUnits, eq(businessUnits.id, assignments.officeId))
      .where(eq(tickets.id, Number(params.id)))
      .limit(1);

    if (!row) {
      set.status = 404;
      return { message: "Ticket not found" };
    }
    return row;
  })

  // POST /tickets/process — trigger batch processing (calls teammate's service)
  .post("/process", async () => {
    // const { processAllTickets } = await import('../services/processing')
    // const result = await processAllTickets()
    // await invalidateStatsCache()
    return 200;
  });
