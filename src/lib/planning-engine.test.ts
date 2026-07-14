import { describe, expect, it } from "vitest";
import { courseById, evidence, programs, seedProfile } from "@/lib/academic-data";
import { MAX_INTERNAL_CANDIDATES, planningEngine, routeValidator } from "@/lib/planning-engine";
import { simulationEngine } from "@/lib/simulation-engine";
import type { RouteCandidate } from "@/lib/domain";
import { meetsMinimumGrade } from "@/lib/grades";

describe("Waylo academic dataset", () => {
  it("contains six pathways across three universities with source metadata", () => {
    expect(programs).toHaveLength(6);
    expect(new Set(programs.map((program) => program.universityId))).toEqual(new Set(["berkeley", "ucla", "ucsd"]));
    expect(evidence.every((item) => item.url && item.effectiveYear && item.retrievedAt && item.status)).toBe(true);
    expect(evidence.find((item) => item.id === "assist-review")?.status).toBe("partial");
  });

  it("models Calculus I through Linear Algebra as a prerequisite graph", () => {
    expect(courseById.get("coc-math-212")?.prerequisites).toContain("coc-math-211");
    expect(courseById.get("coc-math-214")?.prerequisites).toContain("coc-math-212");
  });
});

describe("PlanningEngine", () => {
  it("enforces minimum grades for verified completed coverage", () => {
    expect(meetsMinimumGrade("C-", "C-")).toBe(true);
    expect(meetsMinimumGrade("D+", "C-")).toBe(false);
    const lowGradeProfile = { ...seedProfile, courses: seedProfile.courses.map((course) => course.courseId === "coc-compsci-111" ? { ...course, grade: "D+" } : course) };
    const plan = planningEngine.buildPlan(lowGradeProfile);
    expect(plan.routes[0].terms.some((term) => term.courses.some((course) => course.courseId === "coc-compsci-111"))).toBe(true);
  });

  it.each(programs.map((program) => [program.id]))("builds three validated strategies for %s", (pathwayId) => {
    const plan = planningEngine.buildPlan({ ...seedProfile, selectedPathwayId: pathwayId }, pathwayId);
    expect(plan.routes.map((route) => route.strategy)).toEqual(["fastest", "overlap", "balanced"]);
    expect(plan.routes.every((route) => route.valid)).toBe(true);
    expect(plan.routes.every((route) => route.requirementCoverage === 1)).toBe(true);
    const layouts = plan.routes.map((route) => JSON.stringify(route.terms.map((term) => [term.label, term.courses.map((course) => course.courseId)])));
    expect(new Set(layouts).size).toBe(3);
  });

  it("keeps uncertain course identity out of verified completed coverage", () => {
    const plan = planningEngine.buildPlan(seedProfile);
    expect(plan.reviewItems.some((issue) => issue.code === "uncertain_equivalency")).toBe(true);
    expect(plan.coverageSummary.completed).toBeLessThan(plan.coverageSummary.total);
  });

  it("rejects prerequisite inversion and duplicate credit", () => {
    const plan = planningEngine.buildPlan(seedProfile);
    expect(plan.rejectedCandidates[0].issues.some((issue) => issue.code === "invalid_order")).toBe(true);
    const route = structuredClone(plan.routes[0]);
    const duplicate = seedProfile.courses.find((course) => course.courseId === "coc-compsci-111");
    expect(duplicate).toBeDefined();
    route.terms[0].courses.push({ courseId: duplicate!.courseId, code: duplicate!.code, title: duplicate!.title, units: duplicate!.units, category: "programming", evidenceIds: [], status: "planned" });
    expect(routeValidator.validate(route, seedProfile).some((issue) => issue.code === "duplicate_credit")).toBe(true);
  });

  it("retains bounded real outcomes and revalidates at most one allowlisted repair", () => {
    const plan = planningEngine.buildPlan(seedProfile);
    expect(plan.candidateOutcomes.length).toBeLessThanOrEqual(MAX_INTERNAL_CANDIDATES);
    expect(plan.candidateOutcomes.filter((outcome) => outcome.status === "rejected").length).toBeGreaterThan(0);
    expect(plan.rejectedCandidates.every((route) => route.issues.some((issue) => issue.severity === "blocker"))).toBe(true);
    expect(plan.repairAttempt).toBeDefined();
    expect(plan.candidateOutcomes.filter((outcome) => outcome.status === "repaired")).toHaveLength(1);
    expect(plan.candidateOutcomes.find((outcome) => outcome.status === "repaired")?.route.valid).toBe(true);
  });

  it("uses work hours as advisory ranking context without invalidating a route", () => {
    const plan = planningEngine.buildPlan(seedProfile, seedProfile.selectedPathwayId, { weeklyWorkHours: 25, maxUnits: 15 });
    expect(plan.routes).toHaveLength(3);
    expect(plan.routes.every((route) => route.valid)).toBe(true);
    expect(plan.routes.some((route) => route.assumptions.some((assumption) => assumption.includes("25 weekly work hours")))).toBe(true);
  });

  it("flags a course scheduled in an unsupported known offering term", () => {
    const plan = planningEngine.buildPlan(seedProfile);
    const course = plan.routes[0].terms.flatMap((term) => term.courses).find((item) => item.courseId === "coc-math-214");
    expect(course).toBeDefined();
    const route: RouteCandidate = { ...plan.routes[0], terms: [{ id: "summer-test", label: "Summer 2027", season: "summer", year: 2027, courses: [course!], totalUnits: course!.units }] };
    expect(routeValidator.validate(route, { ...seedProfile, courses: seedProfile.courses.filter((item) => item.courseId !== course!.courseId) }).some((issue) => issue.code === "unknown_offering")).toBe(true);
  });
});

describe("SimulationEngine", () => {
  it("delays the applicable data-science chain from prerequisite data", () => {
    const result = simulationEngine.removeCourse(seedProfile, "coc-math-211");
    expect(result.delta.termDifference).toBeGreaterThan(0);
    expect(result.delta.affectedRequirements).toContain("Calculus I");
    expect(result.delta.explanation).toContain("unlocks Calculus II");
    const beforeTerm = result.baseline.routes[0].terms.find((term) => term.courses.some((course) => course.courseId === "coc-math-211"));
    const afterTerm = result.simulated.routes[0].terms.find((term) => term.courses.some((course) => course.courseId === "coc-math-211"));
    const termOrdinal = (term: NonNullable<typeof beforeTerm>) => term.year * 3 + ({ spring: 0, summer: 1, fall: 2 } as const)[term.season];
    expect(beforeTerm).toBeDefined();
    expect(afterTerm).toBeDefined();
    expect(termOrdinal(afterTerm!)).toBeGreaterThan(termOrdinal(beforeTerm!));
  });

  it("recalculates when switching between cognitive science and data science", () => {
    const cognitive = simulationEngine.switchPathway(seedProfile, "ucla-cogsci");
    const data = simulationEngine.switchPathway(seedProfile, "ucla-data");
    expect(cognitive.coverageSummary.total).not.toBe(data.coverageSummary.total);
    expect(cognitive.routes[0].totalPlannedUnits).not.toBe(data.routes[0].totalPlannedUnits);
  });
});
