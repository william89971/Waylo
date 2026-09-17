import { describe, expect, it } from "vitest";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import { pickRuleForCourse } from "@/lib/articulation/rules";
import { targetMajorId } from "@/lib/articulation/types";

describe("pickRuleForCourse", () => {
  it("prefers an official ASSIST rule when more than one matches", () => {
    const graph = getSeedArticulationGraph();
    const rules = graph.rulesByTargetMajorId.get(targetMajorId("uc_berkeley", "economics")) ?? [];
    const rule = pickRuleForCourse(rules, "MATH-211");
    expect(rule?.label).toBeTruthy();
    expect(rule?.verificationTier).toBe("VERIFIED_ASSIST");
  });
});
