import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull(),
  onboardingStep: integer("onboarding_step").notNull().default(1),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  ...timestamps,
}, (table) => [uniqueIndex("users_clerk_user_id_idx").on(table.clerkUserId)]);

export const studentProfiles = pgTable("student_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  preferredName: text("preferred_name").notNull().default("Student"),
  originInstitutionId: text("origin_institution_id").notNull().default("coc"),
  originInstitutionName: text("origin_institution_name").notNull().default("College of the Canyons"),
  currentTerm: text("current_term"),
  ...timestamps,
}, (table) => [uniqueIndex("student_profiles_user_id_idx").on(table.userId)]);

export const studentCourses = pgTable("student_courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  catalogCourseId: text("catalog_course_id").notNull(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  units: real("units").notNull(),
  grade: text("grade"),
  term: text("term").notNull(),
  status: text("status").notNull(),
  matchStatus: text("match_status").notNull().default("verified"),
  source: text("source").notNull().default("manual"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
}, (table) => [index("student_courses_user_id_idx").on(table.userId), uniqueIndex("student_courses_user_catalog_idx").on(table.userId, table.catalogCourseId)]);

export const transferGoals = pgTable("transfer_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pathwayId: text("pathway_id").notNull().default("ucsd-data"),
  primaryTargetId: text("primary_target_id").notNull().default("uc_san_diego:data_science"),
  secondaryTargetIds: jsonb("secondary_target_ids").$type<string[]>().notNull().default([]),
  includeSecondaryDivergence: boolean("include_secondary_divergence").notNull().default(true),
  coverageTier: text("coverage_tier").notNull().default("reviewed"),
  targetTerm: text("target_term"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("transfer_goals_active_user_idx").on(table.userId)]);

export const planningPreferences = pgTable("planning_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  maxUnits: integer("max_units").notNull().default(15),
  summerEnrollment: boolean("summer_enrollment").notNull().default(false),
  weeklyWorkHours: integer("weekly_work_hours").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("planning_preferences_user_id_idx").on(table.userId)]);

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  pathwayId: text("pathway_id").notNull(),
  strategy: text("strategy").notNull(),
  label: text("label").notNull(),
  estimatedTransferTerm: text("estimated_transfer_term").notNull(),
  totalPlannedUnits: real("total_planned_units").notNull(),
  requirementCoverage: real("requirement_coverage").notNull(),
  algorithmVersion: text("algorithm_version").notNull(),
  academicDataVersion: text("academic_data_version").notNull(),
  evidenceState: text("evidence_state").notNull(),
  assumptions: jsonb("assumptions").$type<string[]>().notNull().default([]),
  primaryTargetId: text("primary_target_id"),
  secondaryTargetIds: jsonb("secondary_target_ids").$type<string[]>().notNull().default([]),
  schedule: jsonb("schedule").$type<Record<string, unknown>>(),
  auditSummary: jsonb("audit_summary").$type<Record<string, unknown>[]>(),
  evidenceGraphSnapshot: jsonb("evidence_graph_snapshot").$type<Record<string, unknown>>(),
  divergencePoints: jsonb("divergence_points").$type<Record<string, unknown>[]>(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("plans_user_id_idx").on(table.userId), uniqueIndex("plans_user_version_idx").on(table.userId, table.version)]);

export const planTerms = pgTable("plan_terms", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  termKey: text("term_key").notNull(),
  label: text("label").notNull(),
  season: text("season").notNull(),
  year: integer("year").notNull(),
  position: integer("position").notNull(),
  totalUnits: real("total_units").notNull(),
}, (table) => [index("plan_terms_plan_id_idx").on(table.planId)]);

export const planCourses = pgTable("plan_courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  planTermId: uuid("plan_term_id").notNull().references(() => planTerms.id, { onDelete: "cascade" }),
  catalogCourseId: text("catalog_course_id").notNull(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  units: real("units").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  evidenceIds: jsonb("evidence_ids").$type<string[]>().notNull().default([]),
  position: integer("position").notNull(),
}, (table) => [index("plan_courses_term_id_idx").on(table.planTermId)]);

export const evidenceSources = pgTable("evidence_sources", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  pathwayId: text("pathway_id"),
  title: text("title").notNull(),
  url: text("url").notNull(),
  effectiveYear: text("effective_year").notNull(),
  retrievedAt: text("retrieved_at").notNull(),
  provenance: text("provenance").notNull(),
  status: text("status").notNull(),
  supportedClaim: text("supported_claim").notNull(),
});

export const academicDataReleases = pgTable("academic_data_releases", {
  id: text("id").primaryKey(),
  pathwayId: text("pathway_id"),
  effectiveYear: text("effective_year").notNull(),
  retrievedAt: text("retrieved_at").notNull(),
  status: text("status").notNull(),
  scope: text("scope").notNull().default("global"),
  algorithmCompatibleVersion: text("algorithm_compatible_version").notNull().default("multi-target-csp-v1"),
  sourceIds: jsonb("source_ids").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Multi-target articulation catalog (Neon runtime source of truth). */
export const institutions = pgTable("institutions", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  unitSystem: text("unit_system").notNull(),
  recognizesIgetc: boolean("recognizes_igetc").notNull().default(false),
  ingestionTier: text("ingestion_tier").notNull().default("1"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const catalogCourses = pgTable("catalog_courses", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  semesterUnits: real("semester_units").notNull(),
  category: text("category").notNull(),
  prerequisites: jsonb("prerequisites").$type<string[]>().notNull().default([]),
  offeredTerms: jsonb("offered_terms").$type<string[]>().notNull().default([]),
  labPairCourseId: text("lab_pair_course_id"),
  releaseId: text("release_id"),
});

export const targetMajors = pgTable("target_majors", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  major: text("major").notNull(),
  displayName: text("display_name").notNull(),
  degree: text("degree").notNull(),
  coverageTier: text("coverage_tier").notNull(),
  constraintNotes: jsonb("constraint_notes").$type<string[]>().notNull().default([]),
  releaseId: text("release_id"),
});

export const coursePrerequisites = pgTable("course_prerequisites", {
  id: text("id").primaryKey(),
  fromCourseId: text("from_course_id").notNull(),
  toCourseId: text("to_course_id").notNull(),
  minGrade: text("min_grade").notNull().default("C"),
  releaseId: text("release_id"),
});

export const articulationRules = pgTable("articulation_rules", {
  id: text("id").primaryKey(),
  targetMajorId: text("target_major_id").notNull(),
  requirementKey: text("requirement_key").notNull(),
  label: text("label").notNull(),
  fulfillmentExpression: jsonb("fulfillment_expression").$type<Record<string, unknown>>().notNull(),
  verificationTier: text("verification_tier").notNull(),
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url").notNull(),
  effectiveYear: text("effective_year").notNull(),
  notes: text("notes").notNull().default(""),
  releaseId: text("release_id"),
});

export const ingestionRuns = pgTable("ingestion_runs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  releaseId: text("release_id"),
  counts: jsonb("counts").$type<Record<string, number>>().notNull().default({}),
  errorSummary: text("error_summary"),
  dryRun: boolean("dry_run").notNull().default(false),
});

export const ingestionRawPayloads = pgTable("ingestion_raw_payloads", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => ingestionRuns.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  contentHash: text("content_hash").notNull(),
  body: jsonb("body").$type<Record<string, unknown>>().notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
});
