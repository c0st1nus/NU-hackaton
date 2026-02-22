import { cookie } from "@elysiajs/cookie";
import { jwt } from "@elysiajs/jwt";
import * as bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { companies, invitations, managers, users } from "../db/schema";
import { config } from "../lib/config";

export const authRoutes = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super-secret-key-change-me",
    }),
  )
  .use(cookie())
  .group("/auth", (app) =>
    app
      .post(
        "/register",
        async ({ body, jwt, cookie: { auth_token } }) => {
          const { companyName, email, password, name } = body;

          // 1. Check if email exists
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          if (existingUser.length > 0) {
            return { error: "Email already in use" };
          }

          // 2. Create Company
          const [company] = await db
            .insert(companies)
            .values({ name: companyName })
            .returning();

          // 3. Hash Password & Create ADMIN User
          const passwordHash = await bcrypt.hash(password, 10);
          const [adminUser] = await db
            .insert(users)
            .values({
              companyId: company.id,
              email,
              passwordHash,
              name,
              role: "ADMIN",
            })
            .returning();

          // 4. Create Voice Agent Robot Manager for the Company
          await db.insert(managers).values({
            companyId: company.id,
            name: "Voice Agent Robot",
            position: "Automated AI Agent",
            office: "Virtual",
            skills: [
              "Жалоба",
              "Смена данных",
              "Консультация",
              "Претензия",
              "Неработоспособность приложения",
              "Мошеннические действия",
              "Спам",
              "RU",
              "KZ",
              "ENG",
              "VIP",
            ],
          });

          // 5. Generate JWT Token
          const token = await jwt.sign({
            id: adminUser.id,
            companyId: adminUser.companyId,
            role: adminUser.role,
          });

          // 6. Set Cookie
          auth_token.set({
            value: token,
            httpOnly: true,
            maxAge: 7 * 86400, // 7 days
            path: "/",
          });

          return { success: true, user: adminUser, company };
        },
        {
          body: t.Object({
            companyName: t.String(),
            email: t.String(),
            password: t.String(),
            name: t.String(),
          }),
        },
      )
      .post(
        "/login",
        async ({ body, jwt, cookie: { auth_token } }) => {
          const { email, password } = body;

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user || !user.passwordHash) {
            return { error: "Invalid credentials" };
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return { error: "Invalid credentials" };
          }

          const token = await jwt.sign({
            id: user.id,
            companyId: user.companyId,
            role: user.role,
          });

          auth_token.set({
            value: token,
            httpOnly: true,
            maxAge: 7 * 86400,
            path: "/",
          });

          return { success: true, user };
        },
        {
          body: t.Object({
            email: t.String(),
            password: t.String(),
          }),
        },
      )
      .get("/me", async ({ jwt, cookie: { auth_token } }) => {
        if (!auth_token || !auth_token.value) return { error: "Unauthorized" };

        const payload = await jwt.verify(auth_token.value as string);
        if (!payload || !payload.id) return { error: "Unauthorized" };

        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            companyId: users.companyId,
          })
          .from(users)
          .where(eq(users.id, payload.id as number))
          .limit(1);

        return user ? { user } : { error: "User not found" };
      })
      .post("/logout", ({ cookie: { auth_token } }) => {
        auth_token.remove();
        return { success: true };
      })

      .post(
        "/invite",
        async ({ body, jwt, cookie: { auth_token } }) => {
          if (!auth_token || !auth_token.value)
            return { error: "Unauthorized" };
          const payload = await jwt.verify(auth_token.value as string);
          if (!payload || payload.role !== "ADMIN")
            return { error: "Only admins can invite" };

          const { role } = body;
          const token = crypto.randomUUID(); // generate unique token

          const [invite] = await db
            .insert(invitations)
            .values({
              companyId: payload.companyId as number,
              role,
              token,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            })
            .returning();

          return {
            success: true,
            inviteLink: `http://localhost:3000/invite/${token}`,
          };
        },
        {
          body: t.Object({
            role: t.String(),
          }),
        },
      )
      .post(
        "/create-user",
        async ({ body, jwt, cookie: { auth_token } }) => {
          if (!auth_token || !auth_token.value)
            return { error: "Unauthorized" };
          const payload = await jwt.verify(auth_token.value as string);
          if (!payload || payload.role !== "ADMIN")
            return { error: "Only admins can create users" };

          const { email, password, name, role } = body;

          // Check if email exists
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          if (existingUser.length > 0) return { error: "Email already exists" };

          const passwordHash = await bcrypt.hash(password, 10);
          const [newUser] = await db
            .insert(users)
            .values({
              companyId: payload.companyId as number,
              email,
              name,
              passwordHash,
              role,
            })
            .returning();

          // Also create a manager profile for them
          await db.insert(managers).values({
            companyId: payload.companyId as number,
            userId: newUser.id,
            name: newUser.name || email.split("@")[0],
            position: role === "MANAGER" ? "Менеджер" : "Сотрудник",
          });

          return { success: true, user: newUser };
        },
        {
          body: t.Object({
            email: t.String(),
            password: t.String(),
            name: t.Optional(t.String()),
            role: t.String(),
          }),
        },
      )
      .post(
        "/invite/accept",
        async ({ body, jwt, cookie: { auth_token } }) => {
          const { token, email, password, name } = body;

          const [invite] = await db
            .select()
            .from(invitations)
            .where(eq(invitations.token, token))
            .limit(1);

          if (
            !invite ||
            invite.isUsed === 1 ||
            new Date(invite.expiresAt) < new Date()
          ) {
            return { error: "Invalid or expired invite" };
          }

          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          if (existingUser.length > 0) return { error: "Email already exists" };

          let newUser;

          if (!password) return { error: "Password required" };
          const passwordHash = await bcrypt.hash(password, 10);
          [newUser] = await db
            .insert(users)
            .values({
              companyId: invite.companyId,
              email,
              name,
              passwordHash,
              role: invite.role,
            })
            .returning();

          // Mark invite as used
          await db
            .update(invitations)
            .set({ isUsed: 1 })
            .where(eq(invitations.id, invite.id));

          // Create a manager profile for them, similar to /create-user
          await db.insert(managers).values({
            companyId: newUser.companyId as number,
            userId: newUser.id,
            name: newUser.name || email.split("@")[0],
            position: newUser.role === "MANAGER" ? "Менеджер" : "Сотрудник",
          });

          // Set cookie
          const authToken = await jwt.sign({
            id: newUser.id,
            companyId: newUser.companyId,
            role: newUser.role,
          });

          auth_token.set({
            value: authToken,
            httpOnly: true,
            maxAge: 7 * 86400,
            path: "/",
          });

          return { success: true, user: newUser };
        },
        {
          body: t.Object({
            token: t.String(),
            email: t.String(),
            name: t.Optional(t.String()),
            password: t.Optional(t.String()),
          }),
        },
      ),
  );
