import {
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── tickets ──────────────────────────────────────────────────────────────────
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  guid: varchar("guid", { length: 64 }).notNull().unique(),
  gender: varchar("gender", { length: 16 }),
  birthDate: text("birth_date"),
  segment: varchar("segment", { length: 32 }),
  description: text("description"),
  country: text("country"),
  city: text("city"),
  street: text("street"),
  house: text("house"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  source: varchar("source", { length: 64 }),
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
  name: text("name").notNull(),
  position: text("position"),
  office: text("office"),
  skills: text("skills").array(),
  currentLoad: integer("current_load").default(0),
});

// ─── business_units ───────────────────────────────────────────────────────────
export const businessUnits = pgTable("business_units", {
  id: serial("id").primaryKey(),
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
