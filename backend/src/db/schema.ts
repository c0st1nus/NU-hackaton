import {
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── companies ────────────────────────────────────────────────────────────────
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  apiToken: text("api_token")
    .unique()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  picture: text("picture"),
  role: varchar("role", { length: 32 }).default("USER"), // ADMIN, MANAGER, USER
  googleId: text("google_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── invitations ──────────────────────────────────────────────────────────────
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  role: varchar("role", { length: 32 }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: integer("is_used").default(0), // 0 or 1
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── tickets ──────────────────────────────────────────────────────────────────
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  guid: varchar("guid", { length: 64 }).notNull().unique(),
  gender: varchar("gender", { length: 16 }),
  birthDate: text("birth_date"),
  segment: varchar("segment", { length: 32 }),
  contact: text("contact"),
  description: text("description"),
  country: text("country"),
  city: text("city"),
  street: text("street"),
  house: text("house"),
  businessUnitId: integer("business_unit_id").references(
    () => businessUnits.id,
  ),
  latitude: real("latitude"),
  longitude: real("longitude"),
  source: varchar("source", { length: 64 }),
  status: varchar("status", { length: 32 }).default("Новый"),
  notes: text("notes").default(""),
  priority: varchar("priority", { length: 16 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── ticket_analysis ──────────────────────────────────────────────────────────
export const ticketAnalysis = pgTable("ticket_analysis", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id),
  ticketType: text("ticket_type"),
  sentiment: text("sentiment"),
  priority: integer("priority"),
  language: varchar("language", { length: 8 }),
  summary: text("summary"),
  recommendation: text("recommendation"),
  processedAt: timestamp("processed_at").defaultNow(),
});

// ─── managers ─────────────────────────────────────────────────────────────────
export const managers = pgTable("managers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  position: text("position"),
  office: text("office"),
  skills: text("skills").array(),
  currentLoad: integer("current_load").default(0),
});

// ─── business_units ───────────────────────────────────────────────────────────
export const businessUnits = pgTable("business_units", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  office: text("office").notNull(),
  address: text("address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
});

// ─── assignments ──────────────────────────────────────────────────────────────
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id),
  analysisId: integer("analysis_id").references(() => ticketAnalysis.id),
  managerId: integer("manager_id").references(() => managers.id),
  officeId: integer("office_id").references(() => businessUnits.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignmentReason: text("assignment_reason"),
});
