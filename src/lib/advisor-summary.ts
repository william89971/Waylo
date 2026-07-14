import { programById } from "@/lib/academic-data";
import type { AdvisorSummary, EvidenceReviewResolution, PlanResult, StudentProfile } from "@/lib/domain";

export function buildAdvisorSummary(profile: StudentProfile, plan: PlanResult, resolutions: EvidenceReviewResolution[] = []): AdvisorSummary {
  const program = programById.get(plan.pathwayId);
  const route = plan.routes[0];
  const reviewItems = [...plan.reviewItems.map((item) => item.message), ...route.issues.filter((issue) => issue.severity !== "blocker").map((issue) => issue.message)];
  return {
    currentPosition: `${profile.originInstitutionName} with ${profile.courses.filter((course) => course.status === "completed").length} completed courses in the normalized workspace.`,
    destination: program ? `${program.universityName} ${program.name} ${program.degree}` : "Unsupported pathway",
    routeStrategy: route.label,
    estimatedTransferTerm: route.estimatedTransferTerm,
    milestones: route.terms.map((term) => `${term.label}: ${term.courses.map((course) => course.code).join(", ")}`),
    verifiedFacts: [
      `The displayed prerequisite sequence ${route.valid ? "passes" : "does not pass"} Waylo's deterministic validation.`,
      `${plan.coverageSummary.completed} of ${plan.coverageSummary.total} pathway requirement groups are covered by verified completed courses.`,
      `The selected route schedules ${route.totalPlannedUnits} planned units within the configured ${profile.maxUnits}-unit term limit.`,
    ],
    counselorConfirmedFacts: resolutions.map((resolution) => `${profile.courses.find((course) => course.courseId === resolution.courseId)?.code ?? resolution.courseId} was reported as counselor-confirmed on ${resolution.confirmedAt.slice(0, 10)}. Its underlying source status remains unchanged.`),
    reviewItems: reviewItems.length > 0 ? reviewItems : ["Recheck current articulation and course offerings before enrollment."],
    questionsForCounselor: [
      "Do the current ASSIST agreements confirm each displayed equivalency?",
      "Are destination-specific breadth or application requirements outside Waylo V1 still outstanding?",
      "Does this workload fit the student's academic and personal commitments?",
    ],
    disclaimer: "Waylo is a planning aid, not an admission or transfer guarantee. Review this plan with a counselor before enrollment decisions.",
  };
}
