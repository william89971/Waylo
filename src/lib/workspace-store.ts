"use client";

import { create } from "zustand";
import { seedProfile } from "@/lib/academic-data";
import { planningEngine } from "@/lib/planning-engine";
import { simulationEngine, type SimulationResult } from "@/lib/simulation-engine";
import { createPlanningEvents } from "@/lib/planning-events";
import { workspaceRepository } from "@/lib/workspace-repository";
import type { WayloWorkspaceV1 } from "@/lib/domain";

const seedPlan = planningEngine.buildPlan(seedProfile);
const seedWorkspace: WayloWorkspaceV1 = {
  version: 1,
  profile: seedProfile,
  activeRouteId: seedPlan.routes[0]?.id,
  plan: seedPlan,
  planningEvents: createPlanningEvents(seedPlan),
  mode: "seeded",
};

interface WorkspaceState {
  workspace: WayloWorkspaceV1;
  simulationResult?: SimulationResult;
  hydrated: boolean;
  hydrate(): Promise<void>;
  selectPathway(pathwayId: string): void;
  selectRoute(routeId: string): void;
  confirmCourse(courseId: string): void;
  simulateRemoval(courseId: string): void;
  clearSimulation(): void;
  applySimulation(): void;
  reset(): Promise<void>;
}

function save(workspace: WayloWorkspaceV1) {
  void workspaceRepository.save(workspace).catch(() => undefined);
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
    const profile = { ...get().workspace.profile, selectedPathwayId: pathwayId };
    const plan = planningEngine.buildPlan(profile, pathwayId);
    const workspace = { ...get().workspace, profile, plan, activeRouteId: plan.routes[0]?.id, simulation: undefined, planningEvents: createPlanningEvents(plan) };
    set({ workspace, simulationResult: undefined });
    save(workspace);
  },
  selectRoute(routeId) {
    const workspace = { ...get().workspace, activeRouteId: routeId };
    set({ workspace });
    save(workspace);
  },
  confirmCourse(courseId) {
    const profile = { ...get().workspace.profile, courses: get().workspace.profile.courses.map((course) => course.courseId === courseId ? { ...course, matchStatus: "verified" as const } : course) };
    const plan = planningEngine.buildPlan(profile);
    const workspace = { ...get().workspace, profile, plan, planningEvents: createPlanningEvents(plan) };
    set({ workspace });
    save(workspace);
  },
  simulateRemoval(courseId) {
    const simulationResult = simulationEngine.removeCourse(get().workspace.profile, courseId);
    const workspace = { ...get().workspace, simulation: simulationResult.delta };
    set({ workspace, simulationResult });
    save(workspace);
  },
  clearSimulation() {
    const workspace = { ...get().workspace, simulation: undefined };
    set({ workspace, simulationResult: undefined });
    save(workspace);
  },
  applySimulation() {
    const result = get().simulationResult;
    if (!result) return;
    const workspace = { ...get().workspace, plan: result.simulated, activeRouteId: result.simulated.routes[0]?.id, simulation: result.delta };
    set({ workspace });
    save(workspace);
  },
  async reset() {
    await workspaceRepository.reset();
    await workspaceRepository.save(seedWorkspace);
    set({ workspace: seedWorkspace, simulationResult: undefined, hydrated: true });
  },
}));
