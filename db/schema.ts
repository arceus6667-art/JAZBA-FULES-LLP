import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const corporateInquiries = sqliteTable('corporate_inquiries', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  companyName: text('company_name').notNull(),
  contactNumber: text('contact_number').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  consent: integer('consent', { mode: 'boolean' }).notNull(),
  status: text('status').notNull().default('New'),
  administrativeNotes: text('administrative_notes').notNull().default(''),
  updatedAt: text('updated_at'),
  fingerprint: text('fingerprint').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('inquiries_created_idx').on(table.createdAt)]);

export const contactRateLimits = sqliteTable('contact_rate_limits', {
  id: text('id').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const adminAudit = sqliteTable('admin_audit', {
  id: text('id').primaryKey(),
  administratorId: text('administrator_id').notNull(),
  administratorEmail: text('administrator_email').notNull(),
  action: text('action').notNull(),
  entityId: text('entity_id').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('admin_audit_created_idx').on(table.createdAt)]);
