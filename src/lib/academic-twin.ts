import { courses, evidence } from "@/lib/academic-data";
import { ACADEMIC_DATA_VERSION, planningEngine } from "@/lib/planning-engine";
import type { AcademicConstraint, AcademicTwin, EvidenceReviewResolution, PlanResult, StudentProfile } from "@/lib/domain";

export const DEFAULT_ACADEMIC_CONSTRAINTS: AcademicConstraint = {
  maxUnits: 15,
  summerEnrollment: false,
  summerCourseLimit: 1,
  weeklyWorkHours: 0,
};

export function constraintsFromProfile(profile: StudentProfile, partial: Partial<AcademicConstraint> = {}): AcademicConstraint {
  return {
    ...DEFAULT_ACADEMIC_CONSTRAINTS,
    maxUnits: profile.maxUnits,
    summerEnrollment: profile.summerEnrollment,
    ...partial,
  };
}

export interface AcademicTwinInput {
  profile: StudentProfile;
  plan?: PlanResult;
  constraints?: AcademicConstraint;
  selectedDestinationIds?: string[];
  reviewResolutions?: EvidenceReviewResolution[];
}

export function buildAcademicTwin(input: AcademicTwinInput): AcademicTwin {
  const constraints = input.constraints ?? constraintsFromProfile(input.profile);
  const plan = input.plan ?? planningEngine.buildPlan(input.profile, input.profile.selectedPathwayId, {
    includeSummer: constraints.summerEnrollment,
    summerCourseLimit: constraints.summerCourseLimit,
    maxUnits: constraints.maxUnits,
    weeklyWorkHours: constraints.weeklyWorkHours,
    transferTarget: constraints.transferTarget?.term,
    targetPolicy: constraints.transferTarget?.policy,
    reviewResolutions: input.reviewResolutions,
  });
  const currentRoute = plan.routes[0] ?? plan.candidateOutcomes.find((outcome) => outcome.status === "repaired")?.route;
  if (!currentRoute) throw new Error("Academic Twin requires one supported route candidate.");
  return {
    version: "academic-twin-v1",
    academicDataVersion: ACADEMIC_DATA_VERSION,
    builtAt: plan.generatedAt,
    profile: input.profile,
    constraints,
    selectedDestinationIds: input.selectedDestinationIds ?? ["berkeley", "ucla", "ucsd"],
    selectedPathwayIds: input.profile.selectedPathwayIds,
    activePathwayId: input.profile.selectedPathwayId,
    evidenceStates: evidence.map((item) => ({ evidenceId: item.id, status: item.status })),
    prerequisiteGraph: courses.map((course) => ({ courseId: course.id, prerequisiteIds: course.prerequisites })),
    currentRoute,
    alternatives: plan.routes.filter((route) => route.id !== currentRoute.id),
    candidateOutcomes: plan.candidateOutcomes,
    counselorResolutions: input.reviewResolutions ?? [],
    unresolvedQuestions: [...plan.reviewItems, ...currentRoute.issues.filter((issue) => issue.severity !== "blocker")],
  };
}
