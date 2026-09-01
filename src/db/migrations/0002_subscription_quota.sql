ALTER TABLE "users" ADD COLUMN "is_paid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_status" text DEFAULT 'inactive' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "previous_plan" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "likes_used_today" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "comments_used_today" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_views_used_today" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "scroll_profiles_used_today" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_quota_reset_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" text NOT NULL,
	"status" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"provider" text NOT NULL,
	"provider_subscription_id" text,
	"provider_payment_id" text,
	"started_at" timestamp,
	"ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_plan" text NOT NULL,
	"to_plan" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"reason" text
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
