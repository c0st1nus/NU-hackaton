import { pgTable, foreignKey, unique, serial, integer, varchar, text, real, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const tickets = pgTable("tickets", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	guid: varchar({ length: 64 }).notNull(),
	gender: varchar({ length: 16 }),
	birthDate: text("birth_date"),
	segment: varchar({ length: 32 }),
	description: text(),
	country: text(),
	city: text(),
	street: text(),
	house: text(),
	latitude: real(),
	longitude: real(),
	source: varchar({ length: 64 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "tickets_company_id_companies_id_fk"
		}),
	unique("tickets_guid_unique").on(table.guid),
]);

export const assignments = pgTable("assignments", {
	id: serial().primaryKey().notNull(),
	ticketId: integer("ticket_id"),
	analysisId: integer("analysis_id"),
	managerId: integer("manager_id"),
	officeId: integer("office_id"),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	assignmentReason: text("assignment_reason"),
}, (table) => [
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tickets.id],
			name: "assignments_ticket_id_tickets_id_fk"
		}),
	foreignKey({
			columns: [table.analysisId],
			foreignColumns: [ticketAnalysis.id],
			name: "assignments_analysis_id_ticket_analysis_id_fk"
		}),
	foreignKey({
			columns: [table.managerId],
			foreignColumns: [managers.id],
			name: "assignments_manager_id_managers_id_fk"
		}),
	foreignKey({
			columns: [table.officeId],
			foreignColumns: [businessUnits.id],
			name: "assignments_office_id_business_units_id_fk"
		}),
]);

export const ticketAnalysis = pgTable("ticket_analysis", {
	id: serial().primaryKey().notNull(),
	ticketId: integer("ticket_id"),
	ticketType: text("ticket_type"),
	sentiment: text(),
	priority: integer(),
	language: varchar({ length: 8 }),
	summary: text(),
	recommendation: text(),
	processedAt: timestamp("processed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tickets.id],
			name: "ticket_analysis_ticket_id_tickets_id_fk"
		}),
]);

export const managers = pgTable("managers", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	userId: integer("user_id"),
	name: text().notNull(),
	position: text(),
	office: text(),
	skills: text().array(),
	currentLoad: integer("current_load").default(0),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "managers_company_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "managers_user_id_users_id_fk"
		}),
]);

export const businessUnits = pgTable("business_units", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	office: text().notNull(),
	address: text(),
	latitude: real(),
	longitude: real(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "business_units_company_id_companies_id_fk"
		}),
]);

export const companies = pgTable("companies", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const invitations = pgTable("invitations", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	role: varchar({ length: 32 }).notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isUsed: integer("is_used").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "invitations_company_id_companies_id_fk"
		}),
	unique("invitations_token_unique").on(table.token),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	email: text().notNull(),
	passwordHash: text("password_hash"),
	name: text(),
	picture: text(),
	role: varchar({ length: 32 }).default('USER'),
	googleId: text("google_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "users_company_id_companies_id_fk"
		}),
	unique("users_email_unique").on(table.email),
	unique("users_google_id_unique").on(table.googleId),
]);
