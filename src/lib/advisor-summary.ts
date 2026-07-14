import { programById } from "@/lib/academic-data";
import { constraintsFromProfile } from "@/lib/academic-twin";
import type { AcademicConstraint, AdvisorDecisionPacket, AdvisorSummary, EvidenceReviewResolution, PlanResult, SimulationDelta, StudentProfile } from "@/lib/domain";

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

export function buildAdvisorDecisionPacket(
  profile: StudentProfile,
  plan: PlanResult,
  resolutions: EvidenceReviewResolution[] = [],
  constraints: AcademicConstraint = constraintsFromProfile(profile),
  simulation?: SimulationDelta,
): AdvisorDecisionPacket {
  const program = programById.get(plan.pathwayId);
  const route = plan.routes.find((candidate) => candidate.id === simulation?.simulatedRouteId) ?? plan.routes[0];
  if (!route) throw new Error("A validated route is required to build an advisor decision packet.");
  const sourceIds = Array.from(new Set([...route.evidenceIds, ...plan.reviewItems.flatMap((item) => item.evidenceIds)]));
  const unresolvedEvidence = [
    ...plan.reviewItems.map((item) => item.message),
    ...route.issues.filter((issue) => issue.severity !== "blocker").map((issue) => issue.message),
  ];
  return {
    generatedAt: new Date().toISOString(),
    currentPosition: `${profile.originInstitutionName} with ${profile.courses.filter((course) => course.status === "completed").length} completed normalized course records.`,
    destination: program ? `${program.universityName} ${program.name} ${program.degree}` : "Unsupported pathway",
    baseline: { routeId: route.id, strategy: route.label, estimatedTransferTerm: simulation?.baselineTransferTerm ?? route.estimatedTransferTerm, valid: route.valid },
    proposal: simulation ? { routeId: simulation.simulatedRouteId, estimatedTransferTerm: simulation.simulatedTransferTerm, valid: simulation.valid, consequence: simulation.explanation } : undefined,
    alternatives: plan.routes.filter((candidate) => candidate.id !== route.id).map((candidate) => ({ routeId: candidate.id, label: candidate.label, estimatedTransferTerm: candidate.estimatedTransferTerm, consequence: candidate.description })),
    workloadConstraints: constraints,
    milestones: route.terms.map((term) => `${term.label}: ${term.courses.map((course) => course.code).join(", ")}`),
    verifiedFacts: [
      `The selected sequence ${route.valid ? "passes" : "does not pass"} Waylo's deterministic prerequisite and confirmed-unit checks.`,
      `${plan.coverageSummary.completed} of ${plan.coverageSummary.total} requirement groups have completed supported coverage.`,
      `${route.totalPlannedUnits} planned units are distributed across ${route.terms.length} terms.`,
    ],
    counselorConfirmedFacts: resolutions.map((resolution) => `${profile.courses.find((course) => course.courseId === resolution.courseId)?.code ?? resolution.courseId} was reported counselor-confirmed on ${resolution.confirmedAt.slice(0, 10)}; its source status remains unchanged.`),
    unresolvedEvidence: unresolvedEvidence.length ? unresolvedEvidence : ["Recheck current articulation and known offerings before enrollment."],
    consequences: [
      ...(simulation ? [simulation.explanation] : []),
      ...(constraints.weeklyWorkHours > 0 ? [`${constraints.weeklyWorkHours} weekly work hours influence advisory workload ranking but do not invalidate the route.`] : []),
      ...(constraints.transferTarget ? [`The ${constraints.transferTarget.term} target is ${constraints.transferTarget.policy}; current target satisfaction is ${simulation?.targetSatisfied === false ? "not met" : "met or not yet simulated"}.`] : []),
    ],
    questionsForCounselor: [
      "Do the current ASSIST agreements confirm each displayed equivalency?",
      "Are destination-specific breadth or application requirements outside Waylo V1 still outstanding?",
      "Does the proposed term-by-term workload fit the student's work and personal commitments?",
    ],
    sourceIds,
    disclaimer: "Waylo is a planning aid, not an admission or transfer guarantee. Review this packet with a counselor before enrollment decisions.",
  };
}
