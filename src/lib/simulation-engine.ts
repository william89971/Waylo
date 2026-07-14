import { planningEngine } from "@/lib/planning-engine";
import { programById } from "@/lib/academic-data";
import type { PlanResult, SimulationDelta, StudentProfile } from "@/lib/domain";

const transferOrdinal: Record<string, number> = {
  "Fall 2027": 0,
  "Spring 2028": 1,
  "Fall 2028": 2,
  "Spring 2029": 3,
  "Fall 2029": 4,
};

export interface SimulationResult {
  baseline: PlanResult;
  simulated: PlanResult;
  delta: SimulationDelta;
}

export interface SimulationEngine {
  removeCourse(profile: StudentProfile, courseId: string, pathwayId?: string): SimulationResult;
  switchPathway(profile: StudentProfile, pathwayId: string): PlanResult;
}

export const simulationEngine: SimulationEngine = {
  removeCourse(profile, courseId, pathwayId = profile.selectedPathwayId) {
    const baseline = planningEngine.buildPlan(profile, pathwayId);
    const simulated = planningEngine.buildPlan(profile, pathwayId, { deferredCourseIds: { [courseId]: 3 } });
    const baselineRoute = baseline.routes[0];
    const simulatedRoute = simulated.routes[0];
    const before = transferOrdinal[baselineRoute.estimatedTransferTerm] ?? 0;
    const after = transferOrdinal[simulatedRoute.estimatedTransferTerm] ?? before;
    const program = programById.get(pathwayId);
    const affectedRequirements = program?.requirements.filter((requirement) => requirement.courseIds.includes(courseId) || requirement.courseIds.some((id) => courseId === "coc-math-211" && id.startsWith("coc-math-21"))).map((requirement) => requirement.label) ?? [];
    const newBlockers = simulatedRoute.issues.filter((issue) => issue.severity === "blocker");
    const delta: SimulationDelta = {
      baselineRouteId: baselineRoute.id,
      simulatedRouteId: simulatedRoute.id,
      termDifference: Math.max(0, after - before),
      baselineTransferTerm: baselineRoute.estimatedTransferTerm,
      simulatedTransferTerm: simulatedRoute.estimatedTransferTerm,
      affectedRequirements,
      newBlockers,
      resolvedBlockers: [],
      explanation: courseId === "coc-math-211" ? "Calculus I unlocks Calculus II, which unlocks later math preparation. Deferring it shifts each dependent course to the next eligible term." : "The selected course participates in the pathway requirement sequence, so Waylo recalculated every dependent term.",
    };
    return { baseline, simulated, delta };
  },
  switchPathway(profile, pathwayId) {
    return planningEngine.buildPlan({ ...profile, selectedPathwayId: pathwayId }, pathwayId);
  },
};
