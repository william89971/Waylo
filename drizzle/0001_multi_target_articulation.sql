CREATE TABLE "institutions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"unit_system" text NOT NULL,
	"recognizes_igetc" boolean DEFAULT false NOT NULL,
	"ingestion_tier" text DEFAULT '1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "catalog_courses" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"semester_units" real NOT NULL,
	"category" text NOT NULL,
	"prerequisites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"offered_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lab_pair_course_id" text,
	"release_id" text
);

CREATE TABLE "target_majors" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"major" text NOT NULL,
	"display_name" text NOT NULL,
	"degree" text NOT NULL,
	"coverage_tier" text NOT NULL,
	"constraint_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"release_id" text
);

CREATE TABLE "course_prerequisites" (
	"id" text PRIMARY KEY NOT NULL,
	"from_course_id" text NOT NULL,
	"to_course_id" text NOT NULL,
	"min_grade" text DEFAULT 'C' NOT NULL,
	"release_id" text
);

CREATE TABLE "articulation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"target_major_id" text NOT NULL,
	"requirement_key" text NOT NULL,
	"label" text NOT NULL,
	"fulfillment_expression" jsonb NOT NULL,
	"verification_tier" text NOT NULL,
	"source_type" text NOT NULL,
	"source_url" text NOT NULL,
	"effective_year" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"release_id" text
);

CREATE TABLE "ingestion_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"release_id" text,
	"counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_summary" text,
	"dry_run" boolean DEFAULT false NOT NULL
);

CREATE TABLE "ingestion_raw_payloads" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"url" text NOT NULL,
	"content_hash" text NOT NULL,
	"body" jsonb NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "transfer_goals" ADD COLUMN "primary_target_id" text DEFAULT 'uc_san_diego:data_science' NOT NULL;
ALTER TABLE "transfer_goals" ADD COLUMN "secondary_target_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "transfer_goals" ADD COLUMN "include_secondary_divergence" boolean DEFAULT true NOT NULL;

ALTER TABLE "plans" ADD COLUMN "primary_target_id" text;
ALTER TABLE "plans" ADD COLUMN "secondary_target_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "plans" ADD COLUMN "schedule" jsonb;
ALTER TABLE "plans" ADD COLUMN "audit_summary" jsonb;
ALTER TABLE "plans" ADD COLUMN "evidence_graph_snapshot" jsonb;
ALTER TABLE "plans" ADD COLUMN "divergence_points" jsonb;

ALTER TABLE "academic_data_releases" ALTER COLUMN "pathway_id" DROP NOT NULL;
ALTER TABLE "academic_data_releases" ADD COLUMN "scope" text DEFAULT 'global' NOT NULL;
ALTER TABLE "academic_data_releases" ADD COLUMN "algorithm_compatible_version" text DEFAULT 'multi-target-csp-v1' NOT NULL;

ALTER TABLE "target_majors" ADD CONSTRAINT "target_majors_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "ingestion_raw_payloads" ADD CONSTRAINT "ingestion_raw_payloads_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE cascade ON UPDATE no action;
