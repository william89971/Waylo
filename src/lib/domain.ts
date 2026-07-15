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
    "hard_target_missed",
    "command_constraint",
    "advisory_workload",
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

export const CandidateRouteOutcomeSchema = z.object({
    id: z.string(),
    candidateId: z.string(),
    strategy: RouteStrategySchema,
    status: z.enum(["accepted", "rejected", "repaired"]),
    route: RouteCandidateSchema,
    rejectionReasons: z.array(ValidationIssueSchema).default([]),
    repairAction: z.enum(["move_prerequisite_earlier", "move_dependent_later", "split_overload", "restore_required_course", "next_known_offering"]).optional(),
    sourceCandidateId: z.string().optional(),
    rank: z.number().int().nonnegative(),
    stableKey: z.string(),
    score: z.object({
      valid: z.number(),
      targetDistance: z.number(),
      objective: z.number(),
      uncertainDependencies: z.number(),
      loadVariance: z.number(),
    }),
});

export const PlanResultSchema = z.object({
  pathwayId: z.string(),
  generatedAt: z.string(),
  routes: z.array(RouteCandidateSchema),
  rejectedCandidates: z.array(RouteCandidateSchema),
  candidateOutcomes: z.array(CandidateRouteOutcomeSchema).default([]),
  repairAttempt: z.object({
    sourceCandidateId: z.string(),
    action: z.enum(["move_prerequisite_earlier", "move_dependent_later", "split_overload", "restore_required_course", "next_known_offering"]),
    outcomeId: z.string(),
    succeeded: z.boolean(),
    detail: z.string(),
  }).optional(),
  reviewItems: z.array(ValidationIssueSchema),
  coverageSummary: z.object({
    completed: z.number(),
    total: z.number(),
    percentage: z.number(),
  }),
});
export type PlanResult = z.infer<typeof PlanResultSchema>;
export type CandidateRouteOutcome = z.infer<typeof CandidateRouteOutcomeSchema>;

export const TransferTargetPolicySchema = z.enum(["preferred", "hard"]);
export type TransferTargetPolicy = z.infer<typeof TransferTargetPolicySchema>;

export const AcademicConstraintSchema = z.object({
  maxUnits: z.number().min(6).max(20),
  summerEnrollment: z.boolean(),
  summerCourseLimit: z.number().int().min(0).max(3),
  weeklyWorkHours: z.number().min(0).max(80),
  transferTarget: z.object({
    term: z.string().regex(/^(Fall|Spring|Summer) \d{4}$/),
    policy: TransferTargetPolicySchema,
  }).optional(),
});
export type AcademicConstraint = z.infer<typeof AcademicConstraintSchema>;

export const SimulationDeltaSchema = z.object({
  baselineRouteId: z.string(),
  simulatedRouteId: z.string(),
  termDifference: z.number(),
  baselineTransferTerm: z.string(),
  simulatedTransferTerm: z.string(),
  affectedRequirements: z.array(z.string()),
  newBlockers: z.array(ValidationIssueSchema),
  resolvedBlockers: z.array(ValidationIssueSchema),
  courseMoves: z.array(z.object({
    courseId: z.string(),
    code: z.string(),
    title: z.string(),
    fromTerm: z.string().nullable(),
    toTerm: z.string().nullable(),
  })).default([]),
  targetTerm: z.string().optional(),
  targetPolicy: TransferTargetPolicySchema.optional(),
  targetSatisfied: z.boolean().optional(),
  valid: z.boolean().default(true),
  acknowledgmentRequired: z.boolean().default(false),
  proposedRouteId: z.string().optional(),
  repairedRouteId: z.string().optional(),
  constraintChanges: z.array(z.string()).default([]),
  pathwayChange: z.object({ from: z.string(), to: z.string() }).optional(),
  destinationChanges: z.array(z.object({ universityId: z.string(), action: z.enum(["added", "removed"]) })).default([]),
  explanation: z.string(),
});
export type SimulationDelta = z.infer<typeof SimulationDeltaSchema>;

export const PlanChangeSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("defer_course"),
    courseId: z.string(),
    courseCode: z.string(),
    courseTitle: z.string(),
    namedTerm: z.string().regex(/^(Fall|Spring|Summer) \d{4}$/).nullable(),
  }),
  z.object({ id: z.string(), type: z.literal("restore_course"), courseId: z.string(), courseCode: z.string(), courseTitle: z.string() }),
  z.object({
    id: z.string(),
    type: z.literal("replace_course"),
    courseId: z.string(),
    courseCode: z.string(),
    replacementCourseId: z.string(),
    replacementCourseCode: z.string(),
    requirementId: z.string(),
  }),
  z.object({ id: z.string(), type: z.literal("set_summer_enrollment"), enabled: z.boolean(), courseLimit: z.number().int().min(0).max(3).nullable() }),
  z.object({ id: z.string(), type: z.literal("set_summer_limit"), coursesPerTerm: z.number().int().min(0).max(3) }),
  z.object({ id: z.string(), type: z.literal("set_max_units"), units: z.number().min(6).max(20) }),
  z.object({ id: z.string(), type: z.literal("set_transfer_target"), term: z.string().regex(/^(Fall|Spring|Summer) \d{4}$/), policy: TransferTargetPolicySchema }),
  z.object({ id: z.string(), type: z.literal("set_pathway"), pathwayId: z.string(), pathwayLabel: z.string() }),
  z.object({ id: z.string(), type: z.literal("add_destination"), universityId: z.string(), universityName: z.string() }),
  z.object({ id: z.string(), type: z.literal("remove_destination"), universityId: z.string(), universityName: z.string() }),
  z.object({ id: z.string(), type: z.literal("set_weekly_work_hours"), hours: z.number().min(0).max(80) }),
]);
export type PlanChange = z.infer<typeof PlanChangeSchema>;

export const PlanCommandInterpretationSchema = z.object({
  summary: z.string(),
  changes: z.array(PlanChangeSchema),
  confidence: z.number().min(0).max(1),
  clarificationItems: z.array(z.string()),
  source: z.enum(["seeded", "live"]),
});
export type PlanCommandInterpretation = z.infer<typeof PlanCommandInterpretationSchema>;

export const EvidenceReviewResolutionSchema = z.object({
  id: z.string(),
  issueId: z.string(),
  courseId: z.string(),
  status: z.literal("counselor-confirmed"),
  confirmedAt: z.string(),
  evidenceIds: z.array(z.string()),
  source: z.literal("student-reported-counselor"),
});
export type EvidenceReviewResolution = z.infer<typeof EvidenceReviewResolutionSchema>;

export const CounselorInquirySchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  evidenceIds: z.array(z.string()),
  createdAt: z.string(),
});
export type CounselorInquiry = z.infer<typeof CounselorInquirySchema>;

export const OperationalTraceEventSchema = z.object({
  id: z.string(),
  stage: z.enum(["source", "extraction", "matching", "review", "planning", "validation", "repair", "route"]),
  label: z.string(),
  detail: z.string(),
  status: z.enum(["active", "complete", "review", "rejected"]),
  evidenceIds: z.array(z.string()).default([]),
  count: z.number().int().nonnegative().optional(),
  timestamp: z.string().datetime().optional(),
  durationMs: z.number().int().nonnegative().max(120_000).optional(),
  outcomeId: z.string().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type OperationalTraceEvent = z.infer<typeof OperationalTraceEventSchema>;

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

export const WayloWorkspaceV2Schema = z.object({
  version: z.literal(2),
  profile: StudentProfileSchema,
  activeRouteId: z.string().optional(),
  plan: PlanResultSchema.optional(),
  simulation: SimulationDeltaSchema.optional(),
  planningEvents: z.array(PlanningEventSchema),
  reviewResolutions: z.array(EvidenceReviewResolutionSchema),
  operationalTrace: z.array(OperationalTraceEventSchema),
  mode: z.enum(["seeded", "live"]),
}).strict();
export type WayloWorkspaceV2 = z.infer<typeof WayloWorkspaceV2Schema>;

export const RequirementVersionSchema = z.object({
  id: z.string(),
  pathwayId: z.string(),
  academicYear: z.string(),
  sourceIds: z.array(z.string()),
  retrievedAt: z.string(),
  fingerprint: z.string(),
  status: z.enum(["verified", "controlled-fixture"]),
});
export type RequirementVersion = z.infer<typeof RequirementVersionSchema>;

export const RequirementChangeSchema = z.object({
  id: z.string(),
  pathwayId: z.string(),
  fromVersionId: z.string(),
  toVersionId: z.string(),
  status: z.enum(["verified", "proposed", "unavailable"]),
  affectedRequirementIds: z.array(z.string()),
  affectedCourseIds: z.array(z.string()),
  summary: z.string(),
});
export type RequirementChange = z.infer<typeof RequirementChangeSchema>;

export const RequirementAffectedSegmentSchema = z.object({
  routeId: z.string(),
  courseId: z.string(),
  courseCode: z.string(),
  term: z.string(),
  state: z.enum(["proposed", "unavailable"]),
});
export type RequirementAffectedSegment = z.infer<typeof RequirementAffectedSegmentSchema>;

export const RequirementChangeComparisonSchema = z.object({
  mode: z.literal("controlled-fixture"),
  disclaimer: z.string(),
  fromVersion: RequirementVersionSchema,
  toVersion: RequirementVersionSchema,
  changes: z.array(RequirementChangeSchema),
  affectedSegments: z.array(RequirementAffectedSegmentSchema),
});
export type RequirementChangeComparison = z.infer<typeof RequirementChangeComparisonSchema>;

export const WayloWorkspaceV3Schema = z.object({
  version: z.literal(3),
  profile: StudentProfileSchema,
  constraints: AcademicConstraintSchema,
  selectedDestinationIds: z.array(z.enum(["berkeley", "ucla", "ucsd"])),
  activeRouteId: z.string().optional(),
  plan: PlanResultSchema.optional(),
  simulation: SimulationDeltaSchema.optional(),
  planningEvents: z.array(PlanningEventSchema),
  reviewResolutions: z.array(EvidenceReviewResolutionSchema),
  operationalTrace: z.array(OperationalTraceEventSchema),
  requirementStaleness: z.array(RequirementChangeSchema),
  mode: z.enum(["seeded", "live"]),
}).strict();
export type WayloWorkspaceV3 = z.infer<typeof WayloWorkspaceV3Schema>;

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

export const TranscriptProgressStageSchema = z.enum([
  "reading_document",
  "extracting_courses",
  "flagging_uncertain_text",
  "matching_known_courses",
  "reviewing_with_student",
  "generating_routes",
  "validating_prerequisites",
]);
export type TranscriptProgressStage = z.infer<typeof TranscriptProgressStageSchema>;

export const TranscriptIngestionEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("progress"),
    stage: TranscriptProgressStageSchema,
    status: z.enum(["active", "complete", "review"]),
    label: z.string(),
    detail: z.string(),
    mode: z.enum(["seeded", "live"]),
  }),
  z.object({ type: z.literal("result"), mode: z.enum(["seeded", "live"]), extraction: TranscriptExtractionSchema }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string(), seededModeAvailable: z.boolean() }),
]);
export type TranscriptIngestionEvent = z.infer<typeof TranscriptIngestionEventSchema>;

export const AdvisorSummarySchema = z.object({
  currentPosition: z.string(),
  destination: z.string(),
  routeStrategy: z.string(),
  estimatedTransferTerm: z.string(),
  milestones: z.array(z.string()),
  verifiedFacts: z.array(z.string()),
  counselorConfirmedFacts: z.array(z.string()),
  reviewItems: z.array(z.string()),
  questionsForCounselor: z.array(z.string()),
  disclaimer: z.string(),
});
export type AdvisorSummary = z.infer<typeof AdvisorSummarySchema>;

export const AdvisorDecisionPacketSchema = z.object({
  generatedAt: z.string(),
  currentPosition: z.string(),
  destination: z.string(),
  baseline: z.object({ routeId: z.string(), strategy: z.string(), estimatedTransferTerm: z.string(), valid: z.boolean() }),
  proposal: z.object({ routeId: z.string(), estimatedTransferTerm: z.string(), valid: z.boolean(), consequence: z.string() }).optional(),
  alternatives: z.array(z.object({ routeId: z.string(), label: z.string(), estimatedTransferTerm: z.string(), consequence: z.string() })),
  workloadConstraints: AcademicConstraintSchema,
  milestones: z.array(z.string()),
  verifiedFacts: z.array(z.string()),
  counselorConfirmedFacts: z.array(z.string()),
  unresolvedEvidence: z.array(z.string()),
  consequences: z.array(z.string()),
  questionsForCounselor: z.array(z.string()),
  sourceIds: z.array(z.string()),
  disclaimer: z.string(),
});
export type AdvisorDecisionPacket = z.infer<typeof AdvisorDecisionPacketSchema>;

export const RouteCanvasNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["current_position", "completed_foundation", "course", "semester", "shared_corridor", "application_milestone", "destination"]),
  label: z.string(),
  detail: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  state: z.enum(["verified", "counselor-confirmed", "uncertain", "broken", "rejected", "proposed", "repaired"]),
  termId: z.string().optional(),
  courseId: z.string().optional(),
  evidenceIds: z.array(z.string()).default([]),
});
export type RouteCanvasNode = z.infer<typeof RouteCanvasNodeSchema>;

export const RouteCanvasEdgeSchema = z.object({
  id: z.string(),
  type: z.enum(["prerequisite", "satisfies", "shared", "branch", "evidence_dependency"]),
  from: z.string(),
  to: z.string(),
  label: z.string(),
  state: z.enum(["verified", "counselor-confirmed", "uncertain", "broken", "rejected", "proposed", "repaired"]),
});
export type RouteCanvasEdge = z.infer<typeof RouteCanvasEdgeSchema>;

export const RouteCanvasStateSchema = z.object({
  routeId: z.string(),
  label: z.string(),
  estimatedTransferTerm: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  nodes: z.array(RouteCanvasNodeSchema),
  edges: z.array(RouteCanvasEdgeSchema),
  valid: z.boolean(),
});
export type RouteCanvasState = z.infer<typeof RouteCanvasStateSchema>;

export const TimeMachineStateSchema = z.enum(["baseline", "proposed", "repaired"]);
export type TimeMachineState = z.infer<typeof TimeMachineStateSchema>;

export const AcademicTwinSchema = z.object({
  version: z.literal("academic-twin-v1"),
  academicDataVersion: z.string(),
  builtAt: z.string(),
  profile: StudentProfileSchema,
  constraints: AcademicConstraintSchema,
  selectedDestinationIds: z.array(z.string()),
  selectedPathwayIds: z.array(z.string()),
  activePathwayId: z.string(),
  evidenceStates: z.array(z.object({ evidenceId: z.string(), status: EvidenceStatusSchema })),
  prerequisiteGraph: z.array(z.object({ courseId: z.string(), prerequisiteIds: z.array(z.string()) })),
  currentRoute: RouteCandidateSchema,
  alternatives: z.array(RouteCandidateSchema),
  candidateOutcomes: z.array(CandidateRouteOutcomeSchema),
  counselorResolutions: z.array(EvidenceReviewResolutionSchema),
  unresolvedQuestions: z.array(ValidationIssueSchema),
});
export type AcademicTwin = z.infer<typeof AcademicTwinSchema>;

export const JudgeModeSnapshotSchema = z.object({
  generatedAt: z.string(),
  execution: z.object({ mode: z.enum(["recorded", "live"]), model: z.literal("gpt-5.6-sol"), reasoningEffort: z.enum(["medium", "high", "xhigh"]), label: z.string() }),
  planning: z.object({ candidateCount: z.number().int().nonnegative(), acceptedCount: z.number().int().nonnegative(), rejectedCount: z.number().int().nonnegative(), repairCount: z.number().int().nonnegative(), validationRules: z.array(z.string()) }),
  evidence: z.object({ sourceCount: z.number().int().nonnegative(), verifiedCount: z.number().int().nonnegative(), reviewCount: z.number().int().nonnegative(), pathwayCount: z.number().int().nonnegative(), destinationCount: z.number().int().nonnegative(), dataVersion: z.string(), lastVerifiedAt: z.string() }),
  latency: z.object({ totalMs: z.number().int().nonnegative(), planningMs: z.number().int().nonnegative(), validationMs: z.number().int().nonnegative() }),
  build: z.object({ commit: z.string(), verified: z.boolean(), verifiedAt: z.string().optional(), label: z.string() }),
  architecture: z.array(z.string()),
});
export type JudgeModeSnapshot = z.infer<typeof JudgeModeSnapshotSchema>;
