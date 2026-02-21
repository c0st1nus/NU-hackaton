import { and, eq, desc } from "drizzle-orm";
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
    async ({ query, user }) => {
      const companyId = (user as any).companyId;
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
            eq(tickets.companyId, companyId)
          ),
        )
        .limit(Number(limit))
        .offset(Number(offset))
        .orderBy(desc(tickets.createdAt));

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
  .get("/:id", async ({ params, set, user }) => {
    const [row] = await db
      .select()
      .from(tickets)
      .leftJoin(ticketAnalysis, eq(ticketAnalysis.ticketId, tickets.id))
      .leftJoin(assignments, eq(assignments.ticketId, tickets.id))
      .leftJoin(managers, eq(managers.id, assignments.managerId))
      .leftJoin(businessUnits, eq(businessUnits.id, assignments.officeId))
      .where(
        and(
          eq(tickets.id, Number(params.id)),
          eq(tickets.companyId, (user as any).companyId)
        )
      )
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
  })

  // PUT /tickets/:id — update a ticket
  .put(
    "/:id",
    async ({ params, body, set, user }) => {
      const companyId = (user as any).companyId;
      const role = (user as any).role;
      const ticketId = Number(params.id);

      // Verify ticket exists
      const [existing] = await db
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, ticketId), eq(tickets.companyId, companyId)))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Ticket not found" };
      }

      if (role === "ADMIN" || role === "ANALYST") {
        // Full update
        const {
          source,
          birthDate,
          gender,
          segment,
          country,
          city,
          street,
          house,
          description,
          status,
          notes,
          managerId, // Optional assignment change
        } = body as any;

        // Update the ticket
        await db
          .update(tickets)
          .set({
            source,
            birthDate,
            gender,
            segment,
            country,
            city,
            street,
            house,
            description,
            status,
            notes,
          })
          .where(eq(tickets.id, ticketId));

        // Update or insert assignment if managerId is provided
        if (managerId !== undefined) {
          const [existingAssignment] = await db
            .select()
            .from(assignments)
            .where(eq(assignments.ticketId, ticketId))
            .limit(1);

          if (managerId === null) {
            // Unassign
            if (existingAssignment) {
              await db.delete(assignments).where(eq(assignments.id, existingAssignment.id));
            }
          } else {
            if (existingAssignment) {
              await db
                .update(assignments)
                .set({ managerId, assignedAt: new Date() })
                .where(eq(assignments.id, existingAssignment.id));
            } else {
              await db.insert(assignments).values({
                ticketId,
                managerId,
              });
            }
          }
        }
      } else if (role === "MANAGER") {
        // Manager can only update notes and status
        const { status, notes } = body as any;
        await db
          .update(tickets)
          .set({ status, notes })
          .where(eq(tickets.id, ticketId));
      } else {
        set.status = 403;
        return { error: "Unauthorized role" };
      }

      return { success: true };
    },
    {
      body: t.Object({
        source: t.Optional(t.String()),
        birthDate: t.Optional(t.String()),
        gender: t.Optional(t.String()),
        segment: t.Optional(t.String()),
        country: t.Optional(t.String()),
        city: t.Optional(t.String()),
        street: t.Optional(t.String()),
        house: t.Optional(t.String()),
        description: t.Optional(t.String()),
        status: t.Optional(t.String()),
        notes: t.Optional(t.String()),
        managerId: t.Optional(t.Union([t.Number(), t.Null()])),
      }),
    }
  )

  // DELETE /tickets/:id
  .delete("/:id", async ({ params, set, user }) => {
    const companyId = (user as any).companyId;
    const role = (user as any).role;
    const ticketId = Number(params.id);

    if (role !== "ADMIN" && role !== "ANALYST") {
      set.status = 403;
      return { error: "Only admins and analysts can delete tickets" };
    }

    // Verify exists
    const [existing] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.companyId, companyId)))
      .limit(1);

    if (!existing) {
      set.status = 404;
      return { error: "Ticket not found" };
    }

    // Delete cascading dependencies manually or by foreign key
    // We should delete analysis and assignments first
    await db.delete(ticketAnalysis).where(eq(ticketAnalysis.ticketId, ticketId));
    await db.delete(assignments).where(eq(assignments.ticketId, ticketId));
    await db.delete(tickets).where(eq(tickets.id, ticketId));

    return { success: true };
  });
