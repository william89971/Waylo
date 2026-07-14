import { z } from "zod";

export const EvidenceStatusSchema = z.enum([
  "verified",
  "partial",
  "uncertain",
  "unavailable",
]);
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;

export const ProvenanceSchema = z.enum([
  "official",
  "assist",
  "human_curated_demo",
  "ai_extracted",
]);
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const EvidenceReferenceSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  pathwayId: z.string().optional(),
  title: z.string(),
  url: z.url(),
  effectiveYear: z.string(),
  retrievedAt: z.string(),
  provenance: ProvenanceSchema,
  status: EvidenceStatusSchema,
  note: z.string(),
});
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;

export const CourseDefinitionSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  code: z.string(),
  title: z.string(),
  units: z.number().positive(),
  category: z.enum(["general", "math", "programming", "science", "major"]),
  prerequisites: z.array(z.string()).default([]),
  offeredTerms: z.array(z.enum(["fall", "spring", "summer"])),
  evidenceIds: z.array(z.string()),
});
export type CourseDefinition = z.infer<typeof CourseDefinitionSchema>;

export const RequirementSchema = z.object({
  id: z.string(),
  label: z.string(),
  courseIds: z.array(z.string()),
  minimumCount: z.number().int().positive().default(1),
  minimumGrade: z.string().default("C-"),
  evidenceIds: z.array(z.string()),
});
export type Requirement = z.infer<typeof RequirementSchema>;

export const ProgramSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  universityName: z.string(),
  name: z.string(),
  degree: z.enum(["B.A.", "B.S."]),
  family: z.enum(["cognitive-science", "data-science"]),
  requirements: z.array(RequirementSchema),
  evidenceIds: z.array(z.string()),
});
export type Program = z.infer<typeof ProgramSchema>;

export const StudentCourseSchema = z.object({
  courseId: z.string(),
  code: z.string(),
  title: z.string(),
  units: z.number().positive(),
  grade: z.string().optional(),
  term: z.string(),
  status: z.enum(["completed", "planned"]),
  matchStatus: EvidenceStatusSchema,
  sourceLabel: z.string().optional(),
});
export type StudentCourse = z.infer<typeof StudentCourseSchema>;

export const StudentProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  originInstitutionId: z.string(),
  originInstitutionName: z.string(),
  courses: z.array(StudentCourseSchema),
  selectedPathwayId: z.string(),
  selectedPathwayIds: z.array(z.string()),
  maxUnits: z.number().min(6).max(20),
  summerEnrollment: z.boolean(),
});
export type StudentProfile = z.infer<typeof StudentProfileSchema>;

export const PlannedCourseSchema = z.object({
  courseId: z.string(),
  code: z.string(),
  title: z.string(),
  units: z.number(),
  category: z.string(),
  evidenceIds: z.array(z.string()),
  status: z.enum(["planned", "completed", "attention", "blocker"]),
});
export type PlannedCourse = z.infer<typeof PlannedCourseSchema>;

export const TermPlanSchema = z.object({
  id: z.string(),
  label: z.string(),
  season: z.enum(["fall", "spring", "summer"]),
  year: z.number(),
  courses: z.array(PlannedCourseSchema),
  totalUnits: z.number(),
});
export type TermPlan = z.infer<typeof TermPlanSchema>;

export const ValidationIssueSchema = z.object({
  id: z.string(),
  severity: z.enum(["review", "warning", "blocker"]),
  code: z.enum([
    "missing_prerequisite",
    "invalid_order",
    "unit_limit",
    "unresolved_requirement",
    "uncertain_equivalency",
    "duplicate_credit",
    "unknown_offering",
    "unsupported_pathway",
  ]),
  message: z.string(),
  affectedIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  nextAction: z.string(),
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const RouteStrategySchema = z.enum(["fastest", "overlap", "balanced"]);
export type RouteStrategy = z.infer<typeof RouteStrategySchema>;

export const RouteCandidateSchema = z.object({
  id: z.string(),
  pathwayId: z.string(),
  strategy: RouteStrategySchema,
  label: z.string(),
  description: z.string(),
  terms: z.array(TermPlanSchema),
  estimatedTransferTerm: z.string(),
  totalPlannedUnits: z.number(),
  requirementCoverage: z.number().min(0).max(1),
  overlapScore: z.number().min(0).max(1),
  issues: z.array(ValidationIssueSchema),
  evidenceIds: z.array(z.string()),
  assumptions: z.array(z.string()),
  valid: z.boolean(),
});
export type RouteCandidate = z.infer<typeof RouteCandidateSchema>;

export const PlanResultSchema = z.object({
  pathwayId: z.string(),
  generatedAt: z.string(),
  routes: z.array(RouteCandidateSchema),
  rejectedCandidates: z.array(RouteCandidateSchema),
  reviewItems: z.array(ValidationIssueSchema),
  coverageSummary: z.object({
    completed: z.number(),
    total: z.number(),
    percentage: z.number(),
  }),
});
export type PlanResult = z.infer<typeof PlanResultSchema>;

export const SimulationDeltaSchema = z.object({
  baselineRouteId: z.string(),
  simulatedRouteId: z.string(),
  termDifference: z.number(),
  baselineTransferTerm: z.string(),
  simulatedTransferTerm: z.string(),
  affectedRequirements: z.array(z.string()),
  newBlockers: z.array(ValidationIssueSchema),
  resolvedBlockers: z.array(ValidationIssueSchema),
  explanation: z.string(),
});
export type SimulationDelta = z.infer<typeof SimulationDeltaSchema>;

export const PlanningEventSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("source"), label: z.string(), detail: z.string(), status: z.literal("complete") }),
  z.object({ id: z.string(), type: z.literal("extraction"), label: z.string(), detail: z.string(), status: z.enum(["complete", "review"]) }),
  z.object({ id: z.string(), type: z.literal("validation"), label: z.string(), detail: z.string(), status: z.enum(["complete", "rejected"]) }),
  z.object({ id: z.string(), type: z.literal("repair"), label: z.string(), detail: z.string(), status: z.literal("complete") }),
  z.object({ id: z.string(), type: z.literal("route"), label: z.string(), detail: z.string(), status: z.literal("complete") }),
  z.object({ id: z.string(), type: z.literal("warning"), label: z.string(), detail: z.string(), status: z.literal("review") }),
]);
export type PlanningEvent = z.infer<typeof PlanningEventSchema>;

export const WayloWorkspaceV1Schema = z.object({
  version: z.literal(1),
  profile: StudentProfileSchema,
  activeRouteId: z.string().optional(),
  plan: PlanResultSchema.optional(),
  simulation: SimulationDeltaSchema.optional(),
  planningEvents: z.array(PlanningEventSchema),
  mode: z.enum(["seeded", "live"]),
}).strict();
export type WayloWorkspaceV1 = z.infer<typeof WayloWorkspaceV1Schema>;

export const TranscriptCourseSchema = z.object({
  sourceCode: z.string(),
  sourceTitle: z.string(),
  normalizedCourseId: z.string().nullable(),
  units: z.number().positive(),
  grade: z.string().nullable(),
  term: z.string(),
  confidence: z.number().min(0).max(1),
  reviewRequired: z.boolean(),
  reviewReason: z.string().nullable(),
});
export type TranscriptCourse = z.infer<typeof TranscriptCourseSchema>;

export const TranscriptExtractionSchema = z.object({
  courses: z.array(TranscriptCourseSchema),
  overallConfidence: z.number().min(0).max(1),
  reviewFlags: z.array(z.string()),
  sourceType: z.enum(["text", "pdf", "image", "seeded"]),
});
export type TranscriptExtraction = z.infer<typeof TranscriptExtractionSchema>;

export const AdvisorSummarySchema = z.object({
  currentPosition: z.string(),
  destination: z.string(),
  routeStrategy: z.string(),
  estimatedTransferTerm: z.string(),
  milestones: z.array(z.string()),
  verifiedFacts: z.array(z.string()),
  reviewItems: z.array(z.string()),
  questionsForCounselor: z.array(z.string()),
  disclaimer: z.string(),
});
export type AdvisorSummary = z.infer<typeof AdvisorSummarySchema>;
