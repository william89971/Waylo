import { describe, expect, it } from "vitest";
import { seedProfile } from "@/lib/academic-data";
import { buildCounselorInquiry } from "@/lib/evidence-actions";
import { comparePathwayRequirementSets } from "@/lib/pathway-comparison";
import { parseSeededPlanCommand } from "@/lib/plan-command";
import { planningEngine } from "@/lib/planning-engine";
import { simulationEngine } from "@/lib/simulation-engine";
import { createPlanningEvents } from "@/lib/planning-events";
import { migrateWorkspace } from "@/lib/workspace-repository";

describe("guided plan commands", () => {
  it("normalizes the supplied Linear Algebra command into bounded changes", () => {
    const parsed = parseSeededPlanCommand("Remove Linear Algebra, use summer classes if necessary, and keep my Fall 2028 transfer target.");
    expect(parsed.clarificationItems).toEqual([]);
    expect(parsed.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "defer_course", courseId: "coc-math-214" }),
      expect.objectContaining({ type: "set_summer_enrollment", enabled: true }),
      expect.objectContaining({ type: "set_transfer_target", term: "Fall 2028" }),
    ]));
  });

  it("flags ambiguous course and transfer references instead of inventing IDs", () => {
    const parsed = parseSeededPlanCommand("Remove that math course and keep my transfer target");
    expect(parsed.changes).toEqual([]);
    expect(parsed.clarificationItems).toHaveLength(2);
  });

  it("applies summer and target constraints through deterministic simulation", () => {
    const parsed = parseSeededPlanCommand("Remove Linear Algebra, use summer classes, and keep Fall 2028 as my transfer target");
    const result = simulationEngine.applyChanges(seedProfile, parsed.changes);
    expect(result.simulatedProfile.summerEnrollment).toBe(true);
    expect(result.delta.targetTerm).toBe("Fall 2028");
    expect(result.delta.courseMoves.some((move) => move.courseId === "coc-math-214")).toBe(true);
    expect(typeof result.delta.targetSatisfied).toBe("boolean");
  });
});

describe("evidence decisions and pathway sets", () => {
  it("calculates shared and unique courses from actual requirement sets", () => {
    const comparison = comparePathwayRequirementSets("berkeley-data", "ucla-data");
    expect(comparison.shared).toEqual(expect.arrayContaining(["MATH 211", "MATH 212", "MATH 214"]));
    expect(comparison.rightOnly).toContain("MATH 213");
  });

  it("counts counselor-confirmed completion without relabeling evidence verified", () => {
    const profile = { ...seedProfile, courses: seedProfile.courses.map((course) => course.courseId === "coc-math-211" ? { ...course, status: "completed" as const, grade: "A", matchStatus: "uncertain" as const } : course) };
    const unresolved = planningEngine.buildPlan(profile);
    const resolution = { id: "resolution-calc", issueId: "review-coc-math-211", courseId: "coc-math-211", status: "counselor-confirmed" as const, confirmedAt: "2026-07-13T18:00:00.000Z", evidenceIds: ["assist-review"], source: "student-reported-counselor" as const };
    const confirmed = planningEngine.buildPlan(profile, profile.selectedPathwayId, { reviewResolutions: [resolution] });
    expect(confirmed.coverageSummary.completed).toBeGreaterThan(unresolved.coverageSummary.completed);
    expect(profile.courses.find((course) => course.courseId === "coc-math-211")?.matchStatus).toBe("uncertain");
    expect(confirmed.reviewItems.some((issue) => issue.affectedIds.includes("coc-math-211"))).toBe(false);
  });

  it("drafts an inquiry with exact sources and an unsettled conclusion", () => {
    const inquiry = buildCounselorInquiry("coc-math-211", "ucla-data");
    expect(inquiry.evidenceIds).toEqual(expect.arrayContaining(["coc-math-2025", "assist-review", "ucla-majors", "ucla-data"]));
    expect(inquiry.body).toContain("do not, by themselves, settle the exact equivalency");
    expect(inquiry.body).toContain("https://assist.org/");
  });
});

describe("WayloWorkspaceV2 migration", () => {
  it("preserves V1 normalized state while adding review and trace collections", () => {
    const plan = planningEngine.buildPlan(seedProfile);
    const migrated = migrateWorkspace({ version: 1, profile: seedProfile, activeRouteId: plan.routes[0].id, plan, planningEvents: createPlanningEvents(plan), mode: "seeded" });
    expect(migrated).toMatchObject({ version: 2, reviewResolutions: [] });
    expect(migrated?.operationalTrace.length).toBeGreaterThan(0);
    expect(migrateWorkspace({ ...migrated, rawTranscript: "must not persist" })).toBeUndefined();
  });
});
