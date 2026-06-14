import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { relations, sql } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

// ── Enums ────────────────────────────────────────────────────────────────────

export const complaintCategories = [
  'plumbing',
  'electrical',
  'elevator',
  'cleaning',
  'noise',
  'parking',
  'other',
] as const
export type ComplaintCategory = (typeof complaintCategories)[number]

export const urgencyLevels = ['low', 'medium', 'high'] as const
export type Urgency = (typeof urgencyLevels)[number]

export const complaintStatuses = ['open', 'resolved'] as const
export type ComplaintStatus = (typeof complaintStatuses)[number]

export const messageSources = ['whatsapp', 'export'] as const
export type MessageSource = (typeof messageSources)[number]

// ── Tables ───────────────────────────────────────────────────────────────────

export const managementCompanies = sqliteTable('management_companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const buildings = sqliteTable('buildings', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  managementCompanyId: text('management_company_id')
    .notNull()
    .references(() => managementCompanies.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const residents = sqliteTable('residents', {
  id: text('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  name: text('name'),
  buildingId: text('building_id')
    .notNull()
    .references(() => buildings.id),
  consentedAt: integer('consented_at', { mode: 'timestamp' }),
  consentToken: text('consent_token').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const complaints = sqliteTable('complaints', {
  id: text('id').primaryKey(),
  buildingId: text('building_id')
    .notNull()
    .references(() => buildings.id),
  residentId: text('resident_id').references(() => residents.id),
  title: text('title'),
  category: text('category').$type<ComplaintCategory>().notNull(),
  urgency: text('urgency').$type<Urgency>().notNull().default('medium'),
  status: text('status').$type<ComplaintStatus>().notNull().default('open'),
  priority: integer('priority').notNull().default(0),
  dedupeTargetId: text('dedupe_target_id').references((): AnySQLiteColumn => complaints.id),
  openedAt: integer('opened_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
})

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  complaintId: text('complaint_id').references(() => complaints.id),
  buildingId: text('building_id')
    .notNull()
    .references(() => buildings.id),
  residentId: text('resident_id').references(() => residents.id),
  content: text('content').notNull(),
  source: text('source').$type<MessageSource>().notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// ── Relations ────────────────────────────────────────────────────────────────

export const managementCompaniesRelations = relations(managementCompanies, ({ many }) => ({
  buildings: many(buildings),
}))

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  managementCompany: one(managementCompanies, {
    fields: [buildings.managementCompanyId],
    references: [managementCompanies.id],
  }),
  residents: many(residents),
  complaints: many(complaints),
  messages: many(messages),
}))

export const residentsRelations = relations(residents, ({ one, many }) => ({
  building: one(buildings, {
    fields: [residents.buildingId],
    references: [buildings.id],
  }),
  complaints: many(complaints),
  messages: many(messages),
}))

export const complaintsRelations = relations(complaints, ({ one, many }) => ({
  building: one(buildings, {
    fields: [complaints.buildingId],
    references: [buildings.id],
  }),
  resident: one(residents, {
    fields: [complaints.residentId],
    references: [residents.id],
  }),
  messages: many(messages),
  dedupeTarget: one(complaints, {
    fields: [complaints.dedupeTargetId],
    references: [complaints.id],
    relationName: 'dedupe',
  }),
  duplicates: many(complaints, { relationName: 'dedupe' }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  complaint: one(complaints, {
    fields: [messages.complaintId],
    references: [complaints.id],
  }),
  building: one(buildings, {
    fields: [messages.buildingId],
    references: [buildings.id],
  }),
  resident: one(residents, {
    fields: [messages.residentId],
    references: [residents.id],
  }),
}))

// ── Inferred Types ───────────────────────────────────────────────────────────

export type ManagementCompany = typeof managementCompanies.$inferSelect
export type NewManagementCompany = typeof managementCompanies.$inferInsert
export type Building = typeof buildings.$inferSelect
export type NewBuilding = typeof buildings.$inferInsert
export type Resident = typeof residents.$inferSelect
export type NewResident = typeof residents.$inferInsert
export type Complaint = typeof complaints.$inferSelect
export type NewComplaint = typeof complaints.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
