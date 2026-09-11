import { describe, expect, it } from "vitest";
import { evaluateExpression, expandCandidateSets } from "@/lib/articulation/expression";
import type { ArticulationExpression } from "@/lib/articulation/types";

describe("articulation expression evaluator", () => {
  it("treats incomplete SERIES_COMPLETE as unsatisfied with zero credit", () => {
    const expression: ArticulationExpression = {
      type: "SERIES_COMPLETE",
      seriesId: "chem-gen",
      courses: ["CHEM-201", "CHEM-202"],
    };
    const partial = evaluateExpression(expression, new Set(["CHEM-201"]));
    expect(partial.satisfied).toBe(false);
    expect(partial.usedCourseCodes).toEqual([]);
    expect(partial.missingCourseCodes).toContain("CHEM-202");
  });

  it("resolves OR alternatives to a satisfied branch", () => {
    const expression: ArticulationExpression = {
      type: "OR",
      clauses: [
        { type: "COURSE", courseCode: "MATH-211" },
        {
          type: "AND",
          clauses: [
            { type: "COURSE", courseCode: "MATH-240" },
            { type: "COURSE", courseCode: "MATH-140" },
          ],
        },
      ],
    };
    expect(evaluateExpression(expression, new Set(["MATH-211"])).satisfied).toBe(true);
    expect(evaluateExpression(expression, new Set(["MATH-240", "MATH-140"])).satisfied).toBe(true);
    expect(evaluateExpression(expression, new Set(["MATH-240"])).satisfied).toBe(false);
  });

  it("expands candidate sets for lecture+lab AND bundles", () => {
    const expression: ArticulationExpression = {
      type: "AND",
      clauses: [
        { type: "COURSE", courseCode: "CMPSCI-111" },
        { type: "COURSE", courseCode: "CMPSCI-111L" },
      ],
    };
    const sets = expandCandidateSets(expression);
    expect(sets.some((set) => set.includes("CMPSCI-111") && set.includes("CMPSCI-111L"))).toBe(true);
  });
});
