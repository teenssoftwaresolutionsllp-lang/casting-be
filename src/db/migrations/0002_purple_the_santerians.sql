CREATE TABLE "biometric_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_version" text NOT NULL,
	"accepted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "face_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"challenge_id" uuid,
	"purpose" text,
	"result" text NOT NULL,
	"similarity_score" real,
	"liveness_passed" boolean NOT NULL,
	"device_id" text,
	"ip" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "face_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nonce" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "face_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_encrypted" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"key_version" integer NOT NULL,
	"model_version" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "biometric_consents" ADD CONSTRAINT "biometric_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_attempts" ADD CONSTRAINT "face_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_attempts" ADD CONSTRAINT "face_attempts_challenge_id_face_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."face_challenges"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_challenges" ADD CONSTRAINT "face_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_templates" ADD CONSTRAINT "face_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "biometric_consents_user_accepted_idx" ON "biometric_consents" USING btree ("user_id","accepted_at");--> statement-breakpoint
CREATE INDEX "face_attempts_user_created_idx" ON "face_attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "face_attempts_user_ip_created_idx" ON "face_attempts" USING btree ("user_id","ip","created_at");--> statement-breakpoint
CREATE INDEX "face_challenges_user_expiry_idx" ON "face_challenges" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "face_templates_one_active_per_user_idx" ON "face_templates" USING btree ("user_id") WHERE "face_templates"."status" = 'active';--> statement-breakpoint
CREATE INDEX "face_templates_user_status_idx" ON "face_templates" USING btree ("user_id","status");