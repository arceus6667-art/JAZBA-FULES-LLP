CREATE TABLE `contact_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `corporate_inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`company_name` text NOT NULL,
	`contact_number` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`consent` integer NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inquiries_created_idx` ON `corporate_inquiries` (`created_at`);