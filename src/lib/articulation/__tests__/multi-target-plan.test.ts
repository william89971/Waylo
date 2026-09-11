import { describe, expect, it } from "vitest";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import { computeMultiTargetPlan } from "@/lib/articulation/multi-target-plan";
import { targetMajorId } from "@/lib/articulation/types";

describe("multi-target planner", () => {
  const graph = getSeedArticulationGraph();
  const ucbEcon = targetMajorId("uc_berkeley", "economics");
  const uscBus = targetMajorId("usc", "business_administration");
  const ucsdData = targetMajorId("uc_san_diego", "data_science");

  it("never schedules MATH-212 before MATH-211", () => {
    const plan = computeMultiTargetPlan({
      history: [],
      primaryTargetId: ucbEcon,
      secondaryTargetIds: [uscBus],
      maxUnitsPerTerm: 15,
      includeSecondaryDivergence: true,
      graph,
    });
    const order = plan.schedule.terms.flatMap((term) => term.courses.map((course) => course.code));
    for (const term of plan.schedule.terms) {
      const codes = term.courses.map((course) => course.code);
      expect(codes.includes("MATH-211") && codes.includes("MATH-212")).toBe(false);
    }
    const first = order.indexOf("MATH-211");
    const second = order.indexOf("MATH-212");
    if (second >= 0) {
      expect(first).toBeGreaterThanOrEqual(0);
      expect(first).toBeLessThan(second);
    }
  });

  it("keeps schedule totals in semester units and quarter audits at 90", () => {
    const plan = computeMultiTargetPlan({
      history: [],
      primaryTargetId: ucsdData,
      maxUnitsPerTerm: 15,
      graph,
    });
    for (const term of plan.schedule.terms) {
      const sum = term.courses.reduce((total, course) => total + course.semesterUnits, 0);
      expect(term.totalSemesterUnits).toBe(sum);
    }
    const audit = plan.auditSummary.find((item) => item.targetMajorId === ucsdData);
    expect(audit?.unitSystem).toBe("quarter");
    expect(audit?.juniorStandingUnits).toBe(90);
  });

  it("tags courses with core/primary/secondary buckets", () => {
    const plan = computeMultiTargetPlan({
      history: [],
      primaryTargetId: ucbEcon,
      secondaryTargetIds: [uscBus],
      includeSecondaryDivergence: true,
      maxUnitsPerTerm: 12,
      graph,
    });
    const buckets = new Set(plan.schedule.terms.flatMap((term) => term.courses.map((course) => course.bucket)));
    expect([...buckets].some((bucket) => bucket === "core_overlap" || bucket === "primary_mandate")).toBe(true);
  });

  it("omits secondary divergence when disabled", () => {
    const excluded = computeMultiTargetPlan({
      history: [],
      primaryTargetId: ucbEcon,
      secondaryTargetIds: [uscBus],
      includeSecondaryDivergence: false,
      maxUnitsPerTerm: 15,
      graph,
    });
    expect(
      excluded.schedule.terms.flatMap((term) => term.courses).every((course) => course.bucket !== "secondary_divergence"),
    ).toBe(true);
  });

  it("fail-closes unknown USC edges as counselor confirmation", () => {
    const plan = computeMultiTargetPlan({
      history: [],
      primaryTargetId: uscBus,
      maxUnitsPerTerm: 15,
      graph,
    });
    const tiers = plan.auditSummary
      .flatMap((audit) => audit.requirementStates.map((requirement) => requirement.verificationTier));
    expect(tiers).toContain("NEEDS_COUNSELOR_CONFIRMATION");
  });

  it("biases primary overlap so multi-target schedule stays under naive union", () => {
    const multi = computeMultiTargetPlan({
      history: [],
      primaryTargetId: ucbEcon,
      secondaryTargetIds: [uscBus],
      includeSecondaryDivergence: true,
      maxUnitsPerTerm: 15,
      graph,
    });
    const primaryOnly = computeMultiTargetPlan({
      history: [],
      primaryTargetId: ucbEcon,
      maxUnitsPerTerm: 15,
      graph,
    });
    const secondaryOnly = computeMultiTargetPlan({
      history: [],
      primaryTargetId: uscBus,
      maxUnitsPerTerm: 15,
      graph,
    });
    expect(multi.totalSemesterUnits).toBeLessThanOrEqual(
      primaryOnly.totalSemesterUnits + secondaryOnly.totalSemesterUnits,
    );
    expect(multi.schedule.terms.flatMap((term) => term.courses).some((course) => course.bucket === "core_overlap")).toBe(true);
  });
});
