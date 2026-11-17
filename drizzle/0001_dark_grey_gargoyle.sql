CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`administrator_id` text NOT NULL,
	`administrator_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_created_idx` ON `admin_audit` (`created_at`);--> statement-breakpoint
ALTER TABLE `corporate_inquiries` ADD `administrative_notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `corporate_inquiries` ADD `updated_at` text;