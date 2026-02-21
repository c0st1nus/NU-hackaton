import { eq, and } from "drizzle-orm";
import { db } from "./src/db";
import { tickets, ticketAnalysis, assignments, managers } from "./src/db/schema";

const test = async () => {
    try {
        const rows = await db
        .select({
            id: tickets.id,
            guid: tickets.guid,
            companyId: tickets.companyId,
        })
        .from(tickets)
        .leftJoin(ticketAnalysis, eq(ticketAnalysis.ticketId, tickets.id))
        .leftJoin(assignments, eq(assignments.ticketId, tickets.id))
        .leftJoin(managers, eq(managers.id, assignments.managerId))
        .where(
            eq(tickets.companyId, 1)
        )
        .limit(10)
        .offset(0);

        console.log("Rows returned:", rows.length);
        console.log("First row:", rows[0]);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

test();
