CREATE TABLE "academic_data_releases" (
	"id" text PRIMARY KEY NOT NULL,
	"pathway_id" text NOT NULL,
	"effective_year" text NOT NULL,
	"retrieved_at" text NOT NULL,
	"status" text NOT NULL,
	"source_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"pathway_id" text,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"effective_year" text NOT NULL,
	"retrieved_at" text NOT NULL,
	"provenance" text NOT NULL,
	"status" text NOT NULL,
	"supported_claim" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_term_id" uuid NOT NULL,
	"catalog_course_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"units" real NOT NULL,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"evidence_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"term_key" text NOT NULL,
	"label" text NOT NULL,
	"season" text NOT NULL,
	"year" integer NOT NULL,
	"position" integer NOT NULL,
	"total_units" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"max_units" integer DEFAULT 15 NOT NULL,
	"summer_enrollment" boolean DEFAULT false NOT NULL,
	"weekly_work_hours" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"pathway_id" text NOT NULL,
	"strategy" text NOT NULL,
	"label" text NOT NULL,
	"estimated_transfer_term" text NOT NULL,
	"total_planned_units" real NOT NULL,
	"requirement_coverage" real NOT NULL,
	"algorithm_version" text NOT NULL,
	"academic_data_version" text NOT NULL,
	"evidence_state" text NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"catalog_course_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"units" real NOT NULL,
	"grade" text,
	"term" text NOT NULL,
	"status" text NOT NULL,
	"match_status" text DEFAULT 'verified' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"preferred_name" text DEFAULT 'Student' NOT NULL,
	"origin_institution_id" text DEFAULT 'coc' NOT NULL,
	"origin_institution_name" text DEFAULT 'College of the Canyons' NOT NULL,
	"current_term" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pathway_id" text DEFAULT 'ucsd-data' NOT NULL,
	"coverage_tier" text DEFAULT 'reviewed' NOT NULL,
	"target_term" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"onboarding_step" integer DEFAULT 1 NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_courses" ADD CONSTRAINT "plan_courses_plan_term_id_plan_terms_id_fk" FOREIGN KEY ("plan_term_id") REFERENCES "public"."plan_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_terms" ADD CONSTRAINT "plan_terms_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_preferences" ADD CONSTRAINT "planning_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_courses" ADD CONSTRAINT "student_courses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_goals" ADD CONSTRAINT "transfer_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_courses_term_id_idx" ON "plan_courses" USING btree ("plan_term_id");--> statement-breakpoint
CREATE INDEX "plan_terms_plan_id_idx" ON "plan_terms" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "planning_preferences_user_id_idx" ON "planning_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plans_user_id_idx" ON "plans" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_user_version_idx" ON "plans" USING btree ("user_id","version");--> statement-breakpoint
CREATE INDEX "student_courses_user_id_idx" ON "student_courses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_courses_user_catalog_idx" ON "student_courses" USING btree ("user_id","catalog_course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_profiles_user_id_idx" ON "student_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transfer_goals_active_user_idx" ON "transfer_goals" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");