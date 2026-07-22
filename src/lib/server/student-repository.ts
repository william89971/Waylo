import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { courseById } from "@/lib/academic-data";
import type { RouteCandidate } from "@/lib/domain";
import type { OnboardingProfile, PlanningPreferencesInput, ProductionCourse, ProductionCourseInput, SavedPlan, StudentWorkspaceRecord } from "@/lib/production-types";
import { ApiError } from "@/lib/server/api-errors";
import { getDatabase } from "@/lib/server/db/client";
import { planCourses, plans, planTerms, planningPreferences, studentCourses, studentProfiles, transferGoals, users } from "@/lib/server/db/schema";

const DEFAULT_PROFILE: OnboardingProfile = {
  preferredName: "Student",
  currentTerm: null,
  onboardingStep: 1,
  onboardingCompleted: false,
};

const DEFAULT_PREFERENCES: PlanningPreferencesInput = {
  maxUnits: 15,
  summerEnrollment: false,
  weeklyWorkHours: 0,
  targetTerm: null,
};

type LocalRecord = StudentWorkspaceRecord & { clerkUserId: string };
const globalStore = globalThis as typeof globalThis & { __wayloLocalUsers?: Map<string, LocalRecord> };
const localUsers = globalStore.__wayloLocalUsers ?? new Map<string, LocalRecord>();
globalStore.__wayloLocalUsers = localUsers;

function localWorkspace(clerkUserId: string): LocalRecord {
  const existing = localUsers.get(clerkUserId);
  if (existing) return existing;
  const created: LocalRecord = {
    clerkUserId,
    userId: randomUUID(),
    profile: { ...DEFAULT_PROFILE },
    courses: [],
    pathwayId: "ucsd-data",
    coverageTier: "reviewed",
    preferences: { ...DEFAULT_PREFERENCES },
  };
  localUsers.set(clerkUserId, created);
  return created;
}

async function ensureDatabaseUser(clerkUserId: string) {
  const db = getDatabase();
  if (!db) return undefined;
  await db.insert(users).values({ clerkUserId }).onConflictDoNothing({ target: users.clerkUserId });
  const [user] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (!user) throw new ApiError("user_creation_failed", "Waylo could not create the student account.", 500, true);
  await Promise.all([
    db.insert(studentProfiles).values({ userId: user.id }).onConflictDoNothing({ target: studentProfiles.userId }),
    db.insert(transferGoals).values({ userId: user.id, pathwayId: "ucsd-data", coverageTier: "reviewed" }).onConflictDoNothing({ target: transferGoals.userId }),
    db.insert(planningPreferences).values({ userId: user.id }).onConflictDoNothing({ target: planningPreferences.userId }),
  ]);
  return user;
}

async function loadSavedPlan(userId: string): Promise<SavedPlan | undefined> {
  const db = getDatabase();
  if (!db) return undefined;
  const [saved] = await db.select().from(plans).where(and(eq(plans.userId, userId), eq(plans.active, true))).orderBy(desc(plans.version)).limit(1);
  if (!saved) return undefined;
  const terms = await db.select().from(planTerms).where(eq(planTerms.planId, saved.id)).orderBy(asc(planTerms.position));
  const termIds = new Set(terms.map((term) => term.id));
  const items = termIds.size ? (await db.select().from(planCourses).orderBy(asc(planCourses.position))).filter((item) => termIds.has(item.planTermId)) : [];
  const route: RouteCandidate = {
    id: saved.id,
    pathwayId: saved.pathwayId,
    strategy: saved.strategy as RouteCandidate["strategy"],
    label: saved.label,
    description: "Saved student plan",
    terms: terms.map((term) => ({
      id: term.termKey,
      label: term.label,
      season: term.season as "fall" | "spring" | "summer",
      year: term.year,
      totalUnits: term.totalUnits,
      courses: items.filter((item) => item.planTermId === term.id).map((item) => ({
        courseId: item.catalogCourseId,
        code: item.code,
        title: item.title,
        units: item.units,
        category: item.category,
        status: item.status as "planned" | "completed" | "attention" | "blocker",
        evidenceIds: item.evidenceIds,
      })),
    })),
    estimatedTransferTerm: saved.estimatedTransferTerm,
    totalPlannedUnits: saved.totalPlannedUnits,
    requirementCoverage: saved.requirementCoverage,
    overlapScore: 0,
    issues: [],
    evidenceIds: [...new Set(items.flatMap((item) => item.evidenceIds))],
    assumptions: saved.assumptions,
    valid: true,
  };
  return {
    id: saved.id,
    version: saved.version,
    route,
    algorithmVersion: saved.algorithmVersion,
    academicDataVersion: saved.academicDataVersion,
    evidenceState: saved.evidenceState as "verified" | "needs_review",
    createdAt: saved.createdAt.toISOString(),
  };
}

export const studentRepository = {
  async load(clerkUserId: string): Promise<StudentWorkspaceRecord> {
    const db = getDatabase();
    if (!db) return structuredClone(localWorkspace(clerkUserId));
    const user = await ensureDatabaseUser(clerkUserId);
    if (!user) throw new ApiError("database_unavailable", "Student storage is unavailable.", 503, true);
    const [[profile], courseRows, [goal], [preferences], activePlan] = await Promise.all([
      db.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id)).limit(1),
      db.select().from(studentCourses).where(eq(studentCourses.userId, user.id)).orderBy(asc(studentCourses.createdAt)),
      db.select().from(transferGoals).where(eq(transferGoals.userId, user.id)).limit(1),
      db.select().from(planningPreferences).where(eq(planningPreferences.userId, user.id)).limit(1),
      loadSavedPlan(user.id),
    ]);
    return {
      userId: user.id,
      profile: {
        preferredName: profile?.preferredName ?? "Student",
        currentTerm: profile?.currentTerm ?? null,
        onboardingStep: user.onboardingStep,
        onboardingCompleted: user.onboardingCompleted,
      },
      courses: courseRows.map((course) => ({
        id: course.id,
        catalogCourseId: course.catalogCourseId,
        code: course.code,
        title: course.title,
        units: course.units,
        grade: course.grade,
        term: course.term,
        status: course.status as "completed" | "in_progress",
        matchStatus: course.matchStatus as ProductionCourse["matchStatus"],
      })),
      pathwayId: (goal?.pathwayId ?? "ucsd-data") as "ucsd-data",
      coverageTier: "reviewed",
      preferences: {
        maxUnits: preferences?.maxUnits ?? 15,
        summerEnrollment: preferences?.summerEnrollment ?? false,
        weeklyWorkHours: preferences?.weeklyWorkHours ?? 0,
        targetTerm: goal?.targetTerm ?? null,
      },
      activePlan,
    };
  },

  async updateProfile(clerkUserId: string, profile: OnboardingProfile) {
    const db = getDatabase();
    if (!db) {
      const current = localWorkspace(clerkUserId);
      current.profile = { ...profile };
      return structuredClone(current);
    }
    const user = await ensureDatabaseUser(clerkUserId);
    if (!user) throw new ApiError("database_unavailable", "Student storage is unavailable.", 503, true);
    await Promise.all([
      db.update(users).set({ onboardingStep: profile.onboardingStep, onboardingCompleted: profile.onboardingCompleted, updatedAt: new Date() }).where(eq(users.id, user.id)),
      db.update(studentProfiles).set({ preferredName: profile.preferredName, currentTerm: profile.currentTerm, updatedAt: new Date() }).where(eq(studentProfiles.userId, user.id)),
    ]);
    return this.load(clerkUserId);
  },

  async updatePreferences(clerkUserId: string, preferences: PlanningPreferencesInput) {
    const db = getDatabase();
    if (!db) {
      const current = localWorkspace(clerkUserId);
      current.preferences = { ...preferences };
      return structuredClone(current);
    }
    const user = await ensureDatabaseUser(clerkUserId);
    if (!user) throw new ApiError("database_unavailable", "Student storage is unavailable.", 503, true);
    await Promise.all([
      db.update(planningPreferences).set({ maxUnits: preferences.maxUnits, summerEnrollment: preferences.summerEnrollment, weeklyWorkHours: preferences.weeklyWorkHours, updatedAt: new Date() }).where(eq(planningPreferences.userId, user.id)),
      db.update(transferGoals).set({ pathwayId: "ucsd-data", targetTerm: preferences.targetTerm, updatedAt: new Date() }).where(eq(transferGoals.userId, user.id)),
    ]);
    return this.load(clerkUserId);
  },

  async saveCourse(clerkUserId: string, input: ProductionCourseInput) {
    const definition = courseById.get(input.catalogCourseId);
    if (!definition || definition.institutionId !== "coc") throw new ApiError("unknown_course", "Choose a reviewed College of the Canyons course.", 400);
    const db = getDatabase();
    if (!db) {
      const current = localWorkspace(clerkUserId);
      const course: ProductionCourse = { id: randomUUID(), ...input, code: definition.code, title: definition.title, units: definition.units, matchStatus: "verified" };
      const index = current.courses.findIndex((item) => item.catalogCourseId === input.catalogCourseId);
      if (index >= 0) current.courses[index] = course; else current.courses.push(course);
      return structuredClone(course);
    }
    const user = await ensureDatabaseUser(clerkUserId);
    if (!user) throw new ApiError("database_unavailable", "Student storage is unavailable.", 503, true);
    await db.insert(studentCourses).values({
      userId: user.id,
      catalogCourseId: definition.id,
      code: definition.code,
      title: definition.title,
      units: definition.units,
      grade: input.grade,
      term: input.term,
      status: input.status,
      matchStatus: "verified",
      source: "manual",
    }).onConflictDoUpdate({
      target: [studentCourses.userId, studentCourses.catalogCourseId],
      set: { grade: input.grade, term: input.term, status: input.status, updatedAt: new Date() },
    });
    return (await this.load(clerkUserId)).courses.find((course) => course.catalogCourseId === definition.id);
  },

  async deleteCourse(clerkUserId: string, courseId: string) {
    const db = getDatabase();
    if (!db) {
      const current = localWorkspace(clerkUserId);
      current.courses = current.courses.filter((course) => course.id !== courseId);
      return;
    }
    const user = await ensureDatabaseUser(clerkUserId);
    if (!user) throw new ApiError("database_unavailable", "Student storage is unavailable.", 503, true);
    await db.delete(studentCourses).where(and(eq(studentCourses.id, courseId), eq(studentCourses.userId, user.id)));
  },

  async savePlan(clerkUserId: string, route: RouteCandidate, algorithmVersion: string, academicDataVersion: string, evidenceState: "verified" | "needs_review") {
    const db = getDatabase();
    if (!db) {
      const current = localWorkspace(clerkUserId);
      const saved: SavedPlan = { id: randomUUID(), version: (current.activePlan?.version ?? 0) + 1, route: structuredClone(route), algorithmVersion, academicDataVersion, evidenceState, createdAt: new Date().toISOString() };
      current.activePlan = saved;
      return structuredClone(saved);
    }
    const user = await ensureDatabaseUser(clerkUserId);
    if (!user) throw new ApiError("database_unavailable", "Student storage is unavailable.", 503, true);
    const [latest] = await db.select({ version: plans.version }).from(plans).where(eq(plans.userId, user.id)).orderBy(desc(plans.version)).limit(1);
    const version = (latest?.version ?? 0) + 1;
    const planId = randomUUID();
    const termRows = route.terms.map((term, position) => ({ id: randomUUID(), term, position }));
    const sql = neon(process.env.DATABASE_URL!);
    const queries = [
      sql`update plans set active = false where user_id = ${user.id}`,
      sql`insert into plans (id, user_id, version, pathway_id, strategy, label, estimated_transfer_term, total_planned_units, requirement_coverage, algorithm_version, academic_data_version, evidence_state, assumptions, active) values (${planId}, ${user.id}, ${version}, ${route.pathwayId}, ${route.strategy}, ${route.label}, ${route.estimatedTransferTerm}, ${route.totalPlannedUnits}, ${route.requirementCoverage}, ${algorithmVersion}, ${academicDataVersion}, ${evidenceState}, ${JSON.stringify(route.assumptions)}::jsonb, true)`,
      ...termRows.flatMap(({ id, term, position }) => [
        sql`insert into plan_terms (id, plan_id, term_key, label, season, year, position, total_units) values (${id}, ${planId}, ${term.id}, ${term.label}, ${term.season}, ${term.year}, ${position}, ${term.totalUnits})`,
        ...term.courses.map((course, coursePosition) => sql`insert into plan_courses (id, plan_term_id, catalog_course_id, code, title, units, category, status, evidence_ids, position) values (${randomUUID()}, ${id}, ${course.courseId}, ${course.code}, ${course.title}, ${course.units}, ${course.category}, ${course.status}, ${JSON.stringify(course.evidenceIds)}::jsonb, ${coursePosition})`),
      ]),
    ];
    await sql.transaction(queries);
    return loadSavedPlan(user.id) as Promise<SavedPlan>;
  },
};
