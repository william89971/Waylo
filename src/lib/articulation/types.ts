import { z } from "zod";

export const TargetInstitutionSchema = z.enum([
  "uc_berkeley",
  "ucla",
  "uc_san_diego",
  "usc",
  "stanford",
  "cornell",
  "harvard",
]);
export type TargetInstitution = z.infer<typeof TargetInstitutionSchema>;

export const TargetMajorKeySchema = z.enum([
  "economics",
  "business_administration",
  "data_science",
  "psychology",
  "bioengineering",
]);
export type TargetMajorKey = z.infer<typeof TargetMajorKeySchema>;

export const ArticulationSourceTypeSchema = z.enum([
  "assist_public",
  "institutional_guide",
  "departmental_precedent",
]);
export type ArticulationSourceType = z.infer<typeof ArticulationSourceTypeSchema>;

export const VerificationTierSchema = z.enum([
  "VERIFIED_ASSIST",
  "VERIFIED_INSTITUTIONAL_GUIDE",
  "HISTORICAL_PRECEDENT",
  "PLANNING_SUGGESTION",
  "NEEDS_COUNSELOR_CONFIRMATION",
]);
export type VerificationTier = z.infer<typeof VerificationTierSchema>;

export const UnitSystemSchema = z.enum(["semester", "quarter"]);
export type UnitSystem = z.infer<typeof UnitSystemSchema>;

export const CourseBucketSchema = z.enum([
  "core_overlap",
  "primary_mandate",
  "secondary_divergence",
]);
export type CourseBucket = z.infer<typeof CourseBucketSchema>;

export type ArticulationExpression =
  | { type: "COURSE"; courseCode: string }
  | { type: "AND"; clauses: ArticulationExpression[] }
  | { type: "OR"; clauses: ArticulationExpression[] }
  | { type: "SERIES_COMPLETE"; seriesId: string; courses: string[] };

export const ArticulationExpressionSchema: z.ZodType<ArticulationExpression> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("COURSE"), courseCode: z.string().min(1) }),
    z.object({ type: z.literal("AND"), clauses: z.array(ArticulationExpressionSchema).min(1) }),
    z.object({ type: z.literal("OR"), clauses: z.array(ArticulationExpressionSchema).min(1) }),
    z.object({
      type: z.literal("SERIES_COMPLETE"),
      seriesId: z.string().min(1),
      courses: z.array(z.string().min(1)).min(2),
    }),
  ]),
);

export function targetMajorId(institution: TargetInstitution, major: TargetMajorKey): string {
  return `${institution}:${major}`;
}

export function parseTargetMajorId(
  id: string,
): { institution: TargetInstitution; major: TargetMajorKey } | undefined {
  const [institution, major] = id.split(":");
  const inst = TargetInstitutionSchema.safeParse(institution);
  const maj = TargetMajorKeySchema.safeParse(major);
  if (!inst.success || !maj.success) return undefined;
  return { institution: inst.data, major: maj.data };
}

export interface CatalogCourse {
  id: string;
  code: string;
  title: string;
  semesterUnits: number;
  category: "general" | "math" | "programming" | "science" | "major";
  prerequisites: string[];
  offeredTerms: Array<"fall" | "spring" | "summer">;
  labPairCourseId?: string;
}

export interface Institution {
  id: TargetInstitution;
  code: string;
  name: string;
  unitSystem: UnitSystem;
  recognizesIgetc: boolean;
  ingestionTier: "1" | "2";
}

export interface TargetMajor {
  id: string;
  institutionId: TargetInstitution;
  major: TargetMajorKey;
  displayName: string;
  degree: "B.A." | "B.S." | "B.S.B.A.";
  coverageTier: "full" | "reviewed" | "archetype";
  constraintNotes: string[];
}

export interface ArticulationRule {
  id: string;
  targetMajorId: string;
  requirementKey: string;
  label: string;
  expression: ArticulationExpression;
  verificationTier: VerificationTier;
  sourceType: ArticulationSourceType;
  sourceUrl: string;
  effectiveYear: string;
  notes: string;
}

export interface CoursePrerequisite {
  id: string;
  fromCourseId: string;
  toCourseId: string;
  minGrade: string;
}

export interface ArticulationGraph {
  releaseId: string;
  institutions: Institution[];
  courses: CatalogCourse[];
  targetMajors: TargetMajor[];
  rules: ArticulationRule[];
  prerequisites: CoursePrerequisite[];
  courseById: Map<string, CatalogCourse>;
  courseByCode: Map<string, CatalogCourse>;
  targetMajorById: Map<string, TargetMajor>;
  rulesByTargetMajorId: Map<string, ArticulationRule[]>;
}

export interface ScheduledCourse {
  courseId: string;
  code: string;
  title: string;
  semesterUnits: number;
  bucket: CourseBucket;
  fulfillsTargetIds: string[];
  verificationTier: VerificationTier;
  evidenceNotes: string[];
  excessElectiveForTargets: string[];
}

export interface ScheduleTerm {
  id: string;
  label: string;
  season: "fall" | "spring" | "summer";
  year: number;
  totalSemesterUnits: number;
  courses: ScheduledCourse[];
  conflicts: Array<{
    kind: "unit_overflow";
    message: string;
    tradeoffCourseIds: string[];
  }>;
}

export interface PlanSchedule {
  unitSystem: "semester";
  maxUnitsPerTerm: number;
  terms: ScheduleTerm[];
  includeSecondaryDivergence: boolean;
}

export interface TargetAuditSummary {
  targetMajorId: string;
  unitSystem: UnitSystem;
  articulatedUnits: number;
  juniorStandingUnits: number;
  juniorStandingMet: boolean;
  requirementStates: Array<{
    requirementKey: string;
    label: string;
    satisfied: boolean;
    historySatisfied: boolean;
    verificationTier: VerificationTier;
    missingCourseCodes: string[];
  }>;
}

export interface DivergencePoint {
  id: string;
  kind: "mutually_exclusive" | "secondary_only" | "superset_excess";
  message: string;
  primaryCourseCodes: string[];
  secondaryCourseCodes: string[];
  secondaryTargetIds: string[];
}

export interface MultiTargetPlanResult {
  primaryTargetId: string;
  secondaryTargetIds: string[];
  schedule: PlanSchedule;
  auditSummary: TargetAuditSummary[];
  divergencePoints: DivergencePoint[];
  evidenceGraphSnapshot: {
    releaseId: string;
    evaluatedAt: string;
    ruleIds: string[];
    verificationTiers: VerificationTier[];
  };
  totalSemesterUnits: number;
  algorithmVersion: string;
}
