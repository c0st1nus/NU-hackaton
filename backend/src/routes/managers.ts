import { and, asc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { assignments, managers, users } from "../db/schema";

export const managersRoutes = new Elysia({ prefix: "/managers" })

  // GET /managers — all managers with user info, ordered by current load
  .get("/", async ({ user }) => {
    const companyId = (user as any).companyId;
    const rows = await db
      .select({
        id: managers.id,
        companyId: managers.companyId,
        userId: managers.userId,
        name: managers.name,
        position: managers.position,
        office: managers.office,
        skills: managers.skills,
        currentLoad: managers.currentLoad,
        email: users.email,
        role: users.role,
      })
      .from(managers)
      .leftJoin(users, eq(managers.userId, users.id))
      .where(eq(managers.companyId, companyId))
      .orderBy(asc(managers.currentLoad));

    return rows;
  })

  // PUT /managers/:id — update a manager (and optionally user role)
  .put(
    "/:id",
    async ({ params, body, set, user }) => {
      const companyId = (user as any).companyId;
      const managerId = Number(params.id);

      // Update manager fields
      const updateData: Record<string, any> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.position !== undefined) updateData.position = body.position;
      if (body.office !== undefined) updateData.office = body.office;
      if (body.skills !== undefined) updateData.skills = body.skills;

      const [updated] = await db
        .update(managers)
        .set(updateData)
        .where(
          and(
            eq(managers.id, managerId),
            eq(managers.companyId, companyId)
          )
        )
        .returning();

      if (!updated) {
        set.status = 404;
        return { error: "Manager not found" };
      }

      // Optionally update user role if provided and manager is linked to a user
      if (body.role && updated.userId) {
        await db
          .update(users)
          .set({ role: body.role })
          .where(eq(users.id, updated.userId));
      }

      return updated;
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        position: t.Optional(t.String()),
        office: t.Optional(t.String()),
        skills: t.Optional(t.Array(t.String())),
        role: t.Optional(t.String()),
      }),
    }
  )

  // DELETE /managers/:id — delete a manager and optionally linked user
  .delete("/:id", async ({ params, set, user }) => {
    const companyId = (user as any).companyId;
    const managerId = Number(params.id);

    // First get the manager to find linked userId
    const [manager] = await db
      .select()
      .from(managers)
      .where(
        and(
          eq(managers.id, managerId),
          eq(managers.companyId, companyId)
        )
      );

    if (!manager) {
      set.status = 404;
      return { error: "Manager not found" };
    }

    // Remove assignments referencing this manager
    await db
      .delete(assignments)
      .where(eq(assignments.managerId, managerId));

    // Delete the manager
    await db
      .delete(managers)
      .where(eq(managers.id, managerId));

    // Delete linked user if exists
    if (manager.userId) {
      await db
        .delete(users)
        .where(eq(users.id, manager.userId));
    }

    return { success: true };
  });
