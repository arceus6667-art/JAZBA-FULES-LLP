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
  fingerprint: text('fingerprint').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('inquiries_created_idx').on(table.createdAt)]);

export const contactRateLimits = sqliteTable('contact_rate_limits', {
  id: text('id').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
