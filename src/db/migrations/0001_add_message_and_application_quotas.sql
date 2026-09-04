ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "messages_used_today" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "audition_applications_used_today" integer DEFAULT 0 NOT NULL;
