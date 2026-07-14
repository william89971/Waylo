"use client";

import { create } from "zustand";
import { courseById, seedProfile } from "@/lib/academic-data";
import { planningEngine } from "@/lib/planning-engine";
import { simulationEngine, type SimulationResult } from "@/lib/simulation-engine";
import { createOperationalTrace, createPlanningEvents } from "@/lib/planning-events";
import { workspaceRepository } from "@/lib/workspace-repository";
import type { PlanChange, TranscriptExtraction, WayloWorkspaceV2 } from "@/lib/domain";

const seedPlan = planningEngine.buildPlan(seedProfile);
const seedWorkspace: WayloWorkspaceV2 = {
  version: 2,
  profile: seedProfile,
  activeRouteId: seedPlan.routes[0]?.id,
  plan: seedPlan,
  planningEvents: createPlanningEvents(seedPlan),
  reviewResolutions: [],
  operationalTrace: createOperationalTrace(seedPlan),
  mode: "seeded",
};

interface WorkspaceState {
  workspace: WayloWorkspaceV2;
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

function save(workspace: WayloWorkspaceV2) {
  void workspaceRepository.save(workspace).catch(() => undefined);
}

function rebuild(workspace: WayloWorkspaceV2, profile = workspace.profile): WayloWorkspaceV2 {
  const plan = planningEngine.buildPlan(profile, profile.selectedPathwayId, { reviewResolutions: workspace.reviewResolutions });
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
    const workspace = rebuild({ ...current, profile: { ...current.profile, selectedPathwayId: pathwayId }, simulation: undefined });
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
    const issueId = `review-${courseId}`;
    if (current.reviewResolutions.some((resolution) => resolution.courseId === courseId)) return;
    const workspace = rebuild({
      ...current,
      reviewResolutions: [...current.reviewResolutions, {
        id: `resolution-${courseId}`,
        issueId,
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
    const result = get().simulateChanges([{ id: `defer-${courseId}`, type: "defer_course", courseId, courseCode: course?.code ?? courseId, courseTitle: course?.title ?? courseId }]);
    set({ simulationResult: result });
  },
  simulateChanges(changes) {
    const current = get().workspace;
    const result = simulationEngine.applyChanges(current.profile, changes, current.profile.selectedPathwayId, current.activeRouteId, current.reviewResolutions);
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
    const workspace: WayloWorkspaceV2 = {
      ...current,
      profile: result.simulatedProfile,
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
