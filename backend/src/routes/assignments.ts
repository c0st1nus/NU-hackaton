import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../db";
import { assignments, managers, ticketAnalysis, tickets } from "../db/schema";

export const assignmentsRoutes = new Elysia({ prefix: "/assignments" })

  // GET /assignments — all assignments with ticket + manager info
  .get("/", async ({ user }) => {
    const rows = await db
      .select({
        id: assignments.id,
        assignedAt: assignments.assignedAt,
        assignmentReason: assignments.assignmentReason,
        ticketId: tickets.id,
        ticketGuid: tickets.guid,
        segment: tickets.segment,
        description: tickets.description,
        ticketType: ticketAnalysis.ticketType,
        priority: ticketAnalysis.priority,
        sentiment: ticketAnalysis.sentiment,
        managerId: managers.id,
        managerName: managers.name,
        managerOffice: managers.office,
        managerPosition: managers.position,
      })
      .from(assignments)
      .leftJoin(tickets, eq(tickets.id, assignments.ticketId))
      .leftJoin(ticketAnalysis, eq(ticketAnalysis.ticketId, tickets.id))
      .leftJoin(managers, eq(managers.id, assignments.managerId))
      .where(eq(tickets.companyId, (user as any).companyId))
      .orderBy(assignments.assignedAt);

    return rows;
  });
