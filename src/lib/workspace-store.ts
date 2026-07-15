"use client";

import { create } from "zustand";
import { constraintsFromProfile } from "@/lib/academic-twin";
import { courseById, programById, seedProfile } from "@/lib/academic-data";
import { planningEngine } from "@/lib/planning-engine";
import { simulationEngine, type SimulationResult } from "@/lib/simulation-engine";
import { createOperationalTrace, createPlanningEvents } from "@/lib/planning-events";
import { workspaceRepository } from "@/lib/workspace-repository";
import type { PlanChange, TranscriptExtraction, WayloWorkspaceV3 } from "@/lib/domain";

const seedConstraints = constraintsFromProfile(seedProfile);
const seedPlan = planningEngine.buildPlan(seedProfile, seedProfile.selectedPathwayId, {
  includeSummer: seedConstraints.summerEnrollment,
  summerCourseLimit: seedConstraints.summerCourseLimit,
  maxUnits: seedConstraints.maxUnits,
  weeklyWorkHours: seedConstraints.weeklyWorkHours,
});
const seedWorkspace: WayloWorkspaceV3 = {
  version: 3,
  profile: seedProfile,
  constraints: seedConstraints,
  selectedDestinationIds: ["berkeley", "ucla", "ucsd"],
  activeRouteId: seedPlan.routes[0]?.id,
  plan: seedPlan,
  planningEvents: createPlanningEvents(seedPlan),
  reviewResolutions: [],
  operationalTrace: createOperationalTrace(seedPlan),
  requirementStaleness: [],
  mode: "seeded",
};

interface WorkspaceState {
  workspace: WayloWorkspaceV3;
  simulationResult?: SimulationResult;
  hydrated: boolean;
  hydrate(): Promise<void>;
  selectPathway(pathwayId: string): void;
  selectRoute(routeId: string): void;
  confirmCourse(courseId: string): void;
  simulateRemoval(courseId: string): void;
  simulateChanges(changes: PlanChange[]): SimulationResult;
  clearSimulation(): void;
  applySimulation(acknowledgeTargetMiss?: boolean): boolean;
  commitTranscriptExtraction(extraction: TranscriptExtraction): void;
  reset(): Promise<void>;
}

function save(workspace: WayloWorkspaceV3) {
  void workspaceRepository.save(workspace).catch(() => undefined);
}

function buildPlan(workspace: WayloWorkspaceV3, profile = workspace.profile) {
  return planningEngine.buildPlan(profile, profile.selectedPathwayId, {
    includeSummer: workspace.constraints.summerEnrollment,
    summerCourseLimit: workspace.constraints.summerCourseLimit,
    maxUnits: workspace.constraints.maxUnits,
    weeklyWorkHours: workspace.constraints.weeklyWorkHours,
    transferTarget: workspace.constraints.transferTarget?.term,
    targetPolicy: workspace.constraints.transferTarget?.policy,
    reviewResolutions: workspace.reviewResolutions,
  });
}

function rebuild(workspace: WayloWorkspaceV3, profile = workspace.profile): WayloWorkspaceV3 {
  const plan = buildPlan(workspace, profile);
  return {
    ...workspace,
    profile,
    plan,
    activeRouteId: plan.routes.find((route) => route.id === workspace.activeRouteId)?.id ?? plan.routes[0]?.id,
    planningEvents: createPlanningEvents(plan),
    operationalTrace: createOperationalTrace(plan),
  };
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: seedWorkspace,
  hydrated: false,
  async hydrate() {
    try {
      const stored = await workspaceRepository.load();
      if (stored) set({ workspace: stored, hydrated: true });
      else { await workspaceRepository.save(seedWorkspace); set({ hydrated: true }); }
    } catch {
      set({ hydrated: true });
    }
  },
  selectPathway(pathwayId) {
    const current = get().workspace;
    const program = programById.get(pathwayId);
    const selectedDestinationIds = program && !new Set<string>(current.selectedDestinationIds).has(program.universityId)
      ? [...current.selectedDestinationIds, program.universityId as "berkeley" | "ucla" | "ucsd"]
      : current.selectedDestinationIds;
    const workspace = rebuild({
      ...current,
      selectedDestinationIds,
      profile: { ...current.profile, selectedPathwayId: pathwayId },
      simulation: undefined,
    });
    set({ workspace, simulationResult: undefined });
    save(workspace);
  },
  selectRoute(routeId) {
    const workspace = { ...get().workspace, activeRouteId: routeId };
    set({ workspace });
    save(workspace);
  },
  confirmCourse(courseId) {
    const current = get().workspace;
    if (current.reviewResolutions.some((resolution) => resolution.courseId === courseId)) return;
    const workspace = rebuild({
      ...current,
      reviewResolutions: [...current.reviewResolutions, {
        id: `resolution-${courseId}`,
        issueId: `review-${courseId}`,
        courseId,
        status: "counselor-confirmed",
        confirmedAt: new Date().toISOString(),
        evidenceIds: ["assist-review"],
        source: "student-reported-counselor",
      }],
    });
    set({ workspace });
    save(workspace);
  },
  simulateRemoval(courseId) {
    const course = courseById.get(courseId);
    get().simulateChanges([{ id: `defer-${courseId}`, type: "defer_course", courseId, courseCode: course?.code ?? courseId, courseTitle: course?.title ?? courseId, namedTerm: null }]);
  },
  simulateChanges(changes) {
    const current = get().workspace;
    const result = simulationEngine.applyChanges(
      current.profile,
      changes,
      current.profile.selectedPathwayId,
      current.activeRouteId,
      current.reviewResolutions,
      current.constraints,
      current.selectedDestinationIds,
    );
    set({ simulationResult: result });
    return result;
  },
  clearSimulation() {
    set({ simulationResult: undefined });
  },
  applySimulation(acknowledgeTargetMiss = false) {
    const result = get().simulationResult;
    if (!result || !result.delta.valid || (result.delta.acknowledgmentRequired && !acknowledgeTargetMiss)) return false;
    const current = get().workspace;
    const workspace: WayloWorkspaceV3 = {
      ...current,
      profile: result.simulatedProfile,
      constraints: result.simulatedConstraints,
      selectedDestinationIds: result.selectedDestinationIds as WayloWorkspaceV3["selectedDestinationIds"],
      plan: result.simulated,
      activeRouteId: result.simulatedRoute.id,
      simulation: result.delta,
      planningEvents: createPlanningEvents(result.simulated),
      operationalTrace: createOperationalTrace(result.simulated),
    };
    set({ workspace, simulationResult: undefined });
    save(workspace);
    return true;
  },
  commitTranscriptExtraction(extraction) {
    const current = get().workspace;
    const imported = extraction.courses.flatMap((item) => {
      if (!item.normalizedCourseId) return [];
      const definition = courseById.get(item.normalizedCourseId);
      if (!definition) return [];
      return [{
        courseId: definition.id,
        code: definition.code,
        title: definition.title,
        units: item.units,
        grade: item.grade ?? undefined,
        term: item.term,
        status: "completed" as const,
        matchStatus: item.reviewRequired ? "uncertain" as const : "verified" as const,
        sourceLabel: "Confirmed transcript extraction",
      }];
    });
    const importedIds = new Set(imported.map((course) => course.courseId));
    const profile = { ...current.profile, courses: [...current.profile.courses.filter((course) => !importedIds.has(course.courseId)), ...imported] };
    const workspace = rebuild(current, profile);
    set({ workspace });
    save(workspace);
  },
  async reset() {
    await workspaceRepository.reset();
    await workspaceRepository.save(seedWorkspace);
    set({ workspace: seedWorkspace, simulationResult: undefined, hydrated: true });
  },
}));
