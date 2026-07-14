import { describe, expect, it } from "vitest";
import { seedProfile } from "@/lib/academic-data";
import { buildCounselorInquiry } from "@/lib/evidence-actions";
import { comparePathwayRequirementSets } from "@/lib/pathway-comparison";
import { parseSeededPlanCommand } from "@/lib/plan-command";
import { planningEngine } from "@/lib/planning-engine";
import { simulationEngine } from "@/lib/simulation-engine";
import { createPlanningEvents } from "@/lib/planning-events";
import { migrateWorkspace } from "@/lib/workspace-repository";
import { buildAcademicTwin, constraintsFromProfile } from "@/lib/academic-twin";
import { buildRouteCanvasModel } from "@/lib/route-canvas";
import { buildAdvisorDecisionPacket } from "@/lib/advisor-summary";
import { buildJudgeSnapshot } from "@/lib/judge-snapshot";
import { compareControlledRequirementVersions } from "@/lib/requirement-change-detector";

describe("guided plan commands", () => {
  it("normalizes the supplied Linear Algebra command into bounded changes", () => {
    const parsed = parseSeededPlanCommand("I work 25 hours each week. Remove Linear Algebra from Spring 2028, allow one summer course, and keep me as close as possible to Fall 2028.");
    expect(parsed.clarificationItems).toEqual([]);
    expect(parsed.changes).toHaveLength(4);
    expect(parsed.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "defer_course", courseId: "coc-math-214", namedTerm: "Spring 2028" }),
      expect.objectContaining({ type: "set_summer_enrollment", enabled: true, courseLimit: 1 }),
      expect.objectContaining({ type: "set_transfer_target", term: "Fall 2028", policy: "preferred" }),
      expect.objectContaining({ type: "set_weekly_work_hours", hours: 25 }),
    ]));
  });

  it("requires clarification when a named course term does not match the active route", () => {
    const route = planningEngine.buildPlan(seedProfile).routes[0];
    const parsed = parseSeededPlanCommand("Remove Linear Algebra from Summer 2026", { activeRoute: route });
    expect(parsed.changes.some((change) => change.type === "defer_course")).toBe(false);
    expect(parsed.clarificationItems[0]).toContain("currently in");
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
    expect(result.simulatedConstraints.summerCourseLimit).toBe(1);
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

describe("Academic Twin and WayloWorkspaceV3", () => {
  it("preserves V1 normalized state while adding review and trace collections", () => {
    const plan = planningEngine.buildPlan(seedProfile);
    const migrated = migrateWorkspace({ version: 1, profile: seedProfile, activeRouteId: plan.routes[0].id, plan, planningEvents: createPlanningEvents(plan), mode: "seeded" });
    expect(migrated).toMatchObject({ version: 3, reviewResolutions: [], selectedDestinationIds: ["berkeley", "ucla", "ucsd"], requirementStaleness: [] });
    expect(migrated?.constraints).toMatchObject({ maxUnits: seedProfile.maxUnits, summerEnrollment: seedProfile.summerEnrollment });
    expect(migrated?.operationalTrace.length).toBeGreaterThan(0);
    expect(migrateWorkspace({ ...migrated, rawTranscript: "must not persist" })).toBeUndefined();
  });

  it("builds a versioned twin and synchronized canvas model from deterministic route data", () => {
    const plan = planningEngine.buildPlan(seedProfile);
    const twin = buildAcademicTwin({ profile: seedProfile, plan, constraints: constraintsFromProfile(seedProfile) });
    const canvas = buildRouteCanvasModel(twin.currentRoute, { originLabel: seedProfile.originInstitutionName, destinationLabel: "UCLA Statistics and Data Science" });
    const routeCourseCount = twin.currentRoute.terms.flatMap((term) => term.courses).length;
    expect(twin.academicDataVersion).toContain("2025-26");
    expect(canvas.nodes.filter((node) => node.type === "course")).toHaveLength(routeCourseCount);
    expect(canvas.edges.some((edge) => edge.type === "prerequisite")).toBe(true);
  });

  it("creates a decision packet and sanitized judge snapshot", () => {
    const plan = planningEngine.buildPlan(seedProfile);
    const constraints = { ...constraintsFromProfile(seedProfile), weeklyWorkHours: 25 };
    const packet = buildAdvisorDecisionPacket(seedProfile, plan, [], constraints);
    const snapshot = buildJudgeSnapshot();
    expect(packet.workloadConstraints.weeklyWorkHours).toBe(25);
    expect(packet.sourceIds.length).toBeGreaterThan(0);
    expect(snapshot.execution.label).toBe("Recorded GPT-5.6 demo result.");
    expect(JSON.stringify(snapshot)).not.toContain("OPENAI_API_KEY");
    expect(snapshot.build.label).toBe("Not verified for this build.");
    expect(snapshot.evidence).toMatchObject({ pathwayCount: 6, destinationCount: 3 });
  });

  it("compares a controlled requirement fixture without making a real-world claim", () => {
    const plan = planningEngine.buildPlan(seedProfile);
    const comparison = compareControlledRequirementVersions(seedProfile.selectedPathwayId, plan.routes[0]);
    expect(comparison.mode).toBe("controlled-fixture");
    expect(comparison.changes[0]).toMatchObject({ status: "proposed", affectedCourseIds: ["coc-math-214"] });
    expect(comparison.affectedSegments[0]).toMatchObject({ courseCode: "MATH 214", state: "proposed" });
    expect(comparison.disclaimer).toContain("not a real catalog");
  });
});
