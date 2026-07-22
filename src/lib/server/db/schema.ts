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
  pathwayId: text("pathway_id").notNull(),
  effectiveYear: text("effective_year").notNull(),
  retrievedAt: text("retrieved_at").notNull(),
  status: text("status").notNull(),
  sourceIds: jsonb("source_ids").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
