import { planningEngine, TERM_SEQUENCE } from "@/lib/planning-engine";
import { programById } from "@/lib/academic-data";
import type { EvidenceReviewResolution, PlanChange, PlanResult, RouteCandidate, SimulationDelta, StudentProfile } from "@/lib/domain";

function termOrdinal(term: string): number {
  const match = /^(Spring|Summer|Fall) (\d{4})$/.exec(term);
  if (!match) return Number.POSITIVE_INFINITY;
  const season = { Spring: 0, Summer: 1, Fall: 2 }[match[1] as "Spring" | "Summer" | "Fall"];
  return Number(match[2]) * 3 + season;
}

export interface SimulationResult {
  baseline: PlanResult;
  simulated: PlanResult;
  baselineRoute: RouteCandidate;
  simulatedRoute: RouteCandidate;
  simulatedProfile: StudentProfile;
  delta: SimulationDelta;
}

export interface SimulationEngine {
  applyChanges(profile: StudentProfile, changes: PlanChange[], pathwayId?: string, activeRouteId?: string, reviewResolutions?: EvidenceReviewResolution[]): SimulationResult;
  removeCourse(profile: StudentProfile, courseId: string, pathwayId?: string): SimulationResult;
  switchPathway(profile: StudentProfile, pathwayId: string): PlanResult;
}

export const simulationEngine: SimulationEngine = {
  applyChanges(profile, changes, pathwayId = profile.selectedPathwayId, activeRouteId, reviewResolutions = []) {
    const baseline = planningEngine.buildPlan(profile, pathwayId, { reviewResolutions });
    const baselineRoute = baseline.routes.find((route) => route.id === activeRouteId) ?? baseline.routes[0];
    const summerChange = changes.find((change) => change.type === "set_summer_enrollment");
    const simulatedProfile = summerChange?.type === "set_summer_enrollment" ? { ...profile, summerEnrollment: summerChange.enabled } : profile;
    const deferredCourseIds = Object.fromEntries(changes.filter((change): change is Extract<PlanChange, { type: "defer_course" }> => change.type === "defer_course").map((change) => {
      const baselineIndex = TERM_SEQUENCE.findIndex((term) => baselineRoute.terms.some((routeTerm) => routeTerm.id === term.id && routeTerm.courses.some((course) => course.courseId === change.courseId)));
      return [change.courseId, baselineIndex >= 0 ? baselineIndex + 1 : 2];
    }));
    const simulated = planningEngine.buildPlan(simulatedProfile, pathwayId, {
      deferredCourseIds,
      includeSummer: simulatedProfile.summerEnrollment,
      reviewResolutions,
    });
    const simulatedRoute = simulated.routes.find((route) => route.strategy === baselineRoute.strategy) ?? simulated.routes[0];
    const before = termOrdinal(baselineRoute.estimatedTransferTerm);
    const after = termOrdinal(simulatedRoute.estimatedTransferTerm);
    const program = programById.get(pathwayId);
    const deferredIds = new Set(Object.keys(deferredCourseIds));
    const affectedRequirements = program?.requirements.filter((requirement) => requirement.courseIds.some((courseId) => deferredIds.has(courseId)) || requirement.courseIds.some((id) => deferredIds.has("coc-math-211") && id.startsWith("coc-math-21"))).map((requirement) => requirement.label) ?? [];
    const newBlockers = simulatedRoute.issues.filter((issue) => issue.severity === "blocker");
    const simulatedBlockerIds = new Set(newBlockers.map((issue) => issue.id));
    const courseMoves = baselineRoute.terms.flatMap((term) => term.courses.map((course) => ({ course, term: term.label }))).map(({ course, term }) => {
      const destination = simulatedRoute.terms.find((candidate) => candidate.courses.some((item) => item.courseId === course.courseId))?.label ?? null;
      return { courseId: course.courseId, code: course.code, title: course.title, fromTerm: term, toTerm: destination };
    }).filter((move) => move.fromTerm !== move.toTerm);
    const targetTerm = changes.find((change): change is Extract<PlanChange, { type: "set_transfer_target" }> => change.type === "set_transfer_target")?.term;
    const targetSatisfied = targetTerm ? after <= termOrdinal(targetTerm) : undefined;
    const valid = simulatedRoute.valid;
    const delta: SimulationDelta = {
      baselineRouteId: baselineRoute.id,
      simulatedRouteId: simulatedRoute.id,
      termDifference: Number.isFinite(before) && Number.isFinite(after) ? Math.max(0, after - before) : 0,
      baselineTransferTerm: baselineRoute.estimatedTransferTerm,
      simulatedTransferTerm: simulatedRoute.estimatedTransferTerm,
      affectedRequirements,
      newBlockers,
      resolvedBlockers: baselineRoute.issues.filter((issue) => issue.severity === "blocker" && !simulatedBlockerIds.has(issue.id)),
      courseMoves,
      targetTerm,
      targetSatisfied,
      valid,
      acknowledgmentRequired: valid && targetSatisfied === false,
      explanation: deferredIds.has("coc-math-211") ? "Calculus I unlocks Calculus II, which unlocks later math preparation. Deferring it shifts each dependent course to the next eligible term." : "Waylo reapplied verified prerequisites, term availability, unit limits, and the requested planning constraints.",
    };
    return { baseline, simulated, baselineRoute, simulatedRoute, simulatedProfile, delta };
  },
  removeCourse(profile, courseId, pathwayId = profile.selectedPathwayId) {
    const course = profile.courses.find((candidate) => candidate.courseId === courseId);
    const planned = planningEngine.buildPlan(profile, pathwayId).routes[0]?.terms.flatMap((term) => term.courses).find((candidate) => candidate.courseId === courseId);
    return this.applyChanges(profile, [{ id: `defer-${courseId}`, type: "defer_course", courseId, courseCode: course?.code ?? planned?.code ?? courseId, courseTitle: course?.title ?? planned?.title ?? courseId }], pathwayId);
  },
  switchPathway(profile, pathwayId) {
    return planningEngine.buildPlan({ ...profile, selectedPathwayId: pathwayId }, pathwayId);
  },
};
