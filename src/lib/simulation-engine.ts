import { constraintsFromProfile } from "@/lib/academic-twin";
import { courseById, programById, programs } from "@/lib/academic-data";
import { planningEngine, TERM_SEQUENCE, termOrdinal } from "@/lib/planning-engine";
import type { AcademicConstraint, EvidenceReviewResolution, PlanChange, PlanResult, RouteCandidate, SimulationDelta, StudentProfile } from "@/lib/domain";

export interface SimulationResult {
  baseline: PlanResult;
  simulated: PlanResult;
  baselineRoute: RouteCandidate;
  proposedRoute?: RouteCandidate;
  repairedRoute?: RouteCandidate;
  simulatedRoute: RouteCandidate;
  simulatedProfile: StudentProfile;
  simulatedConstraints: AcademicConstraint;
  selectedDestinationIds: string[];
  changes: PlanChange[];
  delta: SimulationDelta;
}

export interface SimulationEngine {
  applyChanges(
    profile: StudentProfile,
    changes: PlanChange[],
    pathwayId?: string,
    activeRouteId?: string,
    reviewResolutions?: EvidenceReviewResolution[],
    constraints?: AcademicConstraint,
    selectedDestinationIds?: string[],
  ): SimulationResult;
  removeCourse(profile: StudentProfile, courseId: string, pathwayId?: string): SimulationResult;
  switchPathway(profile: StudentProfile, pathwayId: string): PlanResult;
}

function activeRoute(plan: PlanResult, routeId?: string) {
  return plan.routes.find((route) => route.id === routeId) ?? plan.routes[0] ?? plan.candidateOutcomes[0]?.route;
}

function routePlacement(route: RouteCandidate, courseId: string) {
  return route.terms.find((term) => term.courses.some((course) => course.courseId === courseId));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export const simulationEngine: SimulationEngine = {
  applyChanges(
    profile,
    changes,
    pathwayId = profile.selectedPathwayId,
    activeRouteId,
    reviewResolutions = [],
    currentConstraints = constraintsFromProfile(profile),
    currentDestinations = ["berkeley", "ucla", "ucsd"],
  ) {
    const baseline = planningEngine.buildPlan(profile, pathwayId, {
      includeSummer: currentConstraints.summerEnrollment,
      summerCourseLimit: currentConstraints.summerCourseLimit,
      maxUnits: currentConstraints.maxUnits,
      weeklyWorkHours: currentConstraints.weeklyWorkHours,
      transferTarget: currentConstraints.transferTarget?.term,
      targetPolicy: currentConstraints.transferTarget?.policy,
      reviewResolutions,
    });
    const baselineRoute = activeRoute(baseline, activeRouteId);
    if (!baselineRoute) throw new Error("The current workspace does not contain a route candidate.");

    let constraints = { ...currentConstraints };
    let nextPathwayId = pathwayId;
    let selectedDestinationIds = [...currentDestinations];
    const deferredCourseIds: Record<string, number> = {};
    const excludedCourseTerms: Record<string, string[]> = {};
    const constraintChanges: string[] = [];
    const destinationChanges: SimulationDelta["destinationChanges"] = [];

    for (const change of changes) {
      if (change.type === "defer_course") {
        const placement = routePlacement(baselineRoute, change.courseId);
        const baselineIndex = placement ? TERM_SEQUENCE.findIndex((term) => term.id === placement.id) : -1;
        deferredCourseIds[change.courseId] = baselineIndex >= 0 ? baselineIndex + 1 : 1;
        if (change.namedTerm) excludedCourseTerms[change.courseId] = [change.namedTerm];
        constraintChanges.push(`Move ${change.courseCode} outside ${change.namedTerm ?? placement?.label ?? "its current route position"}`);
      } else if (change.type === "restore_course") {
        delete deferredCourseIds[change.courseId];
        delete excludedCourseTerms[change.courseId];
        constraintChanges.push(`Restore ${change.courseCode} to the earliest eligible term`);
      } else if (change.type === "set_summer_enrollment") {
        constraints = { ...constraints, summerEnrollment: change.enabled, summerCourseLimit: change.courseLimit ?? (change.enabled ? Math.max(1, constraints.summerCourseLimit) : 0) };
        constraintChanges.push(change.enabled ? `Allow up to ${change.courseLimit ?? constraints.summerCourseLimit} summer course${(change.courseLimit ?? constraints.summerCourseLimit) === 1 ? "" : "s"}` : "Disallow summer enrollment");
      } else if (change.type === "set_summer_limit") {
        constraints = { ...constraints, summerCourseLimit: change.coursesPerTerm, summerEnrollment: change.coursesPerTerm > 0 };
        constraintChanges.push(`Limit summer to ${change.coursesPerTerm} courses per term`);
      } else if (change.type === "set_max_units") {
        constraints = { ...constraints, maxUnits: change.units };
        constraintChanges.push(`Set hard term cap to ${change.units} units`);
      } else if (change.type === "set_transfer_target") {
        constraints = { ...constraints, transferTarget: { term: change.term, policy: change.policy } };
        constraintChanges.push(`Set ${change.term} as a ${change.policy} target`);
      } else if (change.type === "set_pathway") {
        nextPathwayId = change.pathwayId;
        constraintChanges.push(`Switch to ${change.pathwayLabel}`);
      } else if (change.type === "set_weekly_work_hours") {
        constraints = { ...constraints, weeklyWorkHours: change.hours };
        constraintChanges.push(`Use ${change.hours} weekly work hours for advisory ranking`);
      } else if (change.type === "add_destination") {
        selectedDestinationIds = unique([...selectedDestinationIds, change.universityId]);
        destinationChanges.push({ universityId: change.universityId, action: "added" });
      } else if (change.type === "remove_destination") {
        selectedDestinationIds = selectedDestinationIds.filter((id) => id !== change.universityId);
        destinationChanges.push({ universityId: change.universityId, action: "removed" });
      }
    }

    const activeProgram = programById.get(nextPathwayId);
    if (activeProgram && !selectedDestinationIds.includes(activeProgram.universityId)) {
      const replacement = programs.find((program) => selectedDestinationIds.includes(program.universityId));
      if (replacement) nextPathwayId = replacement.id;
    }
    const selectedPathwayIds = profile.selectedPathwayIds.filter((id) => {
      const program = programById.get(id);
      return Boolean(program && selectedDestinationIds.includes(program.universityId));
    });
    const simulatedProfile: StudentProfile = {
      ...profile,
      selectedPathwayId: nextPathwayId,
      selectedPathwayIds: selectedPathwayIds.length ? selectedPathwayIds : profile.selectedPathwayIds,
      maxUnits: constraints.maxUnits,
      summerEnrollment: constraints.summerEnrollment,
    };
    const simulated = planningEngine.buildPlan(simulatedProfile, nextPathwayId, {
      deferredCourseIds,
      excludedCourseTerms,
      includeSummer: constraints.summerEnrollment,
      summerCourseLimit: constraints.summerCourseLimit,
      maxUnits: constraints.maxUnits,
      weeklyWorkHours: constraints.weeklyWorkHours,
      transferTarget: constraints.transferTarget?.term,
      targetPolicy: constraints.transferTarget?.policy,
      reviewResolutions,
    });
    const preferred = simulated.routes.find((route) => route.strategy === baselineRoute.strategy) ?? simulated.routes[0];
    const proposedOutcome = simulated.repairAttempt ? simulated.candidateOutcomes.find((outcome) => outcome.candidateId === simulated.repairAttempt?.sourceCandidateId) : simulated.candidateOutcomes.find((outcome) => outcome.status === "rejected");
    const repairedOutcome = simulated.repairAttempt ? simulated.candidateOutcomes.find((outcome) => outcome.id === simulated.repairAttempt?.outcomeId) : undefined;
    const simulatedRoute = preferred ?? baselineRoute;
    const valid = Boolean(preferred?.valid);
    const before = termOrdinal(baselineRoute.estimatedTransferTerm);
    const after = termOrdinal(simulatedRoute.estimatedTransferTerm);
    const program = programById.get(nextPathwayId);
    const deferredIds = new Set(Object.keys(deferredCourseIds));
    const affectedRequirements = program?.requirements
      .filter((requirement) => requirement.courseIds.some((courseId) => deferredIds.has(courseId)) || requirement.courseIds.some((id) => deferredIds.has("coc-math-211") && id.startsWith("coc-math-21")))
      .map((requirement) => requirement.label) ?? [];
    const newBlockers = (preferred ? preferred.issues : proposedOutcome?.route.issues ?? []).filter((issue) => issue.severity === "blocker");
    const simulatedBlockerIds = new Set(newBlockers.map((issue) => issue.id));
    const courseMoves = baselineRoute.terms
      .flatMap((term) => term.courses.map((course) => ({ course, term: term.label })))
      .map(({ course, term }) => {
        const destination = simulatedRoute.terms.find((candidate) => candidate.courses.some((item) => item.courseId === course.courseId))?.label ?? null;
        return { courseId: course.courseId, code: course.code, title: course.title, fromTerm: term, toTerm: destination };
      })
      .filter((move) => move.fromTerm !== move.toTerm);
    const targetTerm = constraints.transferTarget?.term;
    const targetSatisfied = targetTerm ? after <= termOrdinal(targetTerm) : undefined;
    const targetPolicy = constraints.transferTarget?.policy;
    const pathwayChange = nextPathwayId !== pathwayId ? { from: pathwayId, to: nextPathwayId } : undefined;
    const delta: SimulationDelta = {
      baselineRouteId: baselineRoute.id,
      simulatedRouteId: simulatedRoute.id,
      proposedRouteId: proposedOutcome?.route.id,
      repairedRouteId: repairedOutcome?.route.id,
      termDifference: Number.isFinite(before) && Number.isFinite(after) ? after - before : 0,
      baselineTransferTerm: baselineRoute.estimatedTransferTerm,
      simulatedTransferTerm: simulatedRoute.estimatedTransferTerm,
      affectedRequirements,
      newBlockers,
      resolvedBlockers: baselineRoute.issues.filter((issue) => issue.severity === "blocker" && !simulatedBlockerIds.has(issue.id)),
      courseMoves,
      targetTerm,
      targetPolicy,
      targetSatisfied,
      valid,
      acknowledgmentRequired: valid && targetPolicy !== "hard" && targetSatisfied === false,
      constraintChanges,
      pathwayChange,
      destinationChanges,
      explanation: deferredIds.has("coc-math-211")
        ? "Calculus I unlocks Calculus II, which unlocks later mathematics preparation. The engine moved dependent courses to the next eligible terms."
        : "Waylo searched bounded candidates, rejected invalid schedules, attempted one allowed repair, and revalidated the final route against prerequisites, offerings, evidence, and confirmed unit limits.",
    };
    return {
      baseline,
      simulated,
      baselineRoute,
      proposedRoute: proposedOutcome?.route,
      repairedRoute: repairedOutcome?.route,
      simulatedRoute,
      simulatedProfile,
      simulatedConstraints: constraints,
      selectedDestinationIds,
      changes,
      delta,
    };
  },
  removeCourse(profile, courseId, pathwayId = profile.selectedPathwayId) {
    const course = profile.courses.find((candidate) => candidate.courseId === courseId) ?? courseById.get(courseId);
    const planned = planningEngine.buildPlan(profile, pathwayId).routes[0]?.terms.flatMap((term) => term.courses).find((candidate) => candidate.courseId === courseId);
    return this.applyChanges(profile, [{ id: `defer-${courseId}`, type: "defer_course", courseId, courseCode: course?.code ?? planned?.code ?? courseId, courseTitle: course?.title ?? planned?.title ?? courseId, namedTerm: null }], pathwayId);
  },
  switchPathway(profile, pathwayId) {
    return planningEngine.buildPlan({ ...profile, selectedPathwayId: pathwayId }, pathwayId);
  },
};
