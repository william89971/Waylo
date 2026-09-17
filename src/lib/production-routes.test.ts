import { describe, expect, it } from "vitest";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import type { StudentWorkspaceRecord } from "@/lib/production-types";
import {
  buildProductionRouteOptions,
  listRouteKnobVariants,
  loadPhrase,
  reachesPreferredTerm,
  routePreferenceId,
  routeTitle,
} from "@/lib/production-routes";

function workspace(overrides: Partial<StudentWorkspaceRecord> = {}): StudentWorkspaceRecord {
  return {
    userId: "student-1",
    profile: {
      preferredName: "Student",
      currentTerm: null,
      onboardingStep: 4,
      onboardingCompleted: true,
    },
    courses: [],
    pathwayId: "ucsd-data",
    primaryTargetId: "uc_san_diego:data_science",
    secondaryTargetIds: [],
    includeSecondaryDivergence: true,
    coverageTier: "reviewed",
    preferences: {
      maxUnits: 15,
      summerEnrollment: false,
      weeklyWorkHours: 0,
      targetTerm: null,
    },
    ...overrides,
  };
}

describe("production routes", () => {
  it("names the current load in student language", () => {
    expect(loadPhrase(15)).toBe("4 classes · typical");
    expect(loadPhrase(12)).toBe("3 classes · lighter");
  });

  it("offers summer and a lighter load when the student has one school", () => {
    const variants = listRouteKnobVariants(workspace());
    expect(variants[0]).toMatchObject({ maxUnits: 15, summerEnrollment: false });
    expect(variants.some((variant) => variant.summerEnrollment)).toBe(true);
    expect(variants.some((variant) => variant.maxUnits === 12)).toBe(true);
  });

  it("offers a first-choice-only variant when a second school is selected", () => {
    const variants = listRouteKnobVariants(
      workspace({ secondaryTargetIds: ["usc:business_administration"] }),
    );
    expect(variants.some((variant) => variant.includeSecondaryDivergence === false)).toBe(true);
    expect(routeTitle(variants.find((variant) => !variant.includeSecondaryDivergence)!, variants[0]!)).toBe(
      "First-choice school only",
    );
  });

  it("keeps route ids stable from saved preferences", () => {
    expect(routePreferenceId({ maxUnits: 15, summerEnrollment: false, includeSecondaryDivergence: true })).toBe(
      "15-ay-all",
    );
  });

  it("knows whether a finish term meets a preferred transfer term", () => {
    expect(reachesPreferredTerm("Spring 2028", "Fall 2028")).toBe(true);
    expect(reachesPreferredTerm("Fall 2029", "Fall 2028")).toBe(false);
    expect(reachesPreferredTerm("Spring 2028", null)).toBeNull();
  });

  it("builds unique selectable routes from the live planner", () => {
    const options = buildProductionRouteOptions(workspace(), getSeedArticulationGraph(), []);
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options.filter((option) => option.selected)).toHaveLength(1);
    expect(options[0]?.title).toMatch(/Your route/);
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
    expect(options.some((option) => option.nextTermCodes.length > 0)).toBe(true);
  });
});
