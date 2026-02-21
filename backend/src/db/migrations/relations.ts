import { relations } from "drizzle-orm/relations";
import { companies, tickets, assignments, ticketAnalysis, managers, businessUnits, users, invitations } from "./schema";

export const ticketsRelations = relations(tickets, ({one, many}) => ({
	company: one(companies, {
		fields: [tickets.companyId],
		references: [companies.id]
	}),
	assignments: many(assignments),
	ticketAnalyses: many(ticketAnalysis),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	tickets: many(tickets),
	managers: many(managers),
	businessUnits: many(businessUnits),
	invitations: many(invitations),
	users: many(users),
}));

export const assignmentsRelations = relations(assignments, ({one}) => ({
	ticket: one(tickets, {
		fields: [assignments.ticketId],
		references: [tickets.id]
	}),
	ticketAnalysis: one(ticketAnalysis, {
		fields: [assignments.analysisId],
		references: [ticketAnalysis.id]
	}),
	manager: one(managers, {
		fields: [assignments.managerId],
		references: [managers.id]
	}),
	businessUnit: one(businessUnits, {
		fields: [assignments.officeId],
		references: [businessUnits.id]
	}),
}));

export const ticketAnalysisRelations = relations(ticketAnalysis, ({one, many}) => ({
	assignments: many(assignments),
	ticket: one(tickets, {
		fields: [ticketAnalysis.ticketId],
		references: [tickets.id]
	}),
}));

export const managersRelations = relations(managers, ({one, many}) => ({
	assignments: many(assignments),
	company: one(companies, {
		fields: [managers.companyId],
		references: [companies.id]
	}),
	user: one(users, {
		fields: [managers.userId],
		references: [users.id]
	}),
}));

export const businessUnitsRelations = relations(businessUnits, ({one, many}) => ({
	assignments: many(assignments),
	company: one(companies, {
		fields: [businessUnits.companyId],
		references: [companies.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	managers: many(managers),
	company: one(companies, {
		fields: [users.companyId],
		references: [companies.id]
	}),
}));

export const invitationsRelations = relations(invitations, ({one}) => ({
	company: one(companies, {
		fields: [invitations.companyId],
		references: [companies.id]
	}),
}));