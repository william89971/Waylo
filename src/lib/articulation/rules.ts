import { collectCourseCodes } from "@/lib/articulation/expression";
import type { ArticulationRule } from "@/lib/articulation/types";

export function pickRuleForCourse(
  rules: ArticulationRule[],
  courseCode: string,
): ArticulationRule | undefined {
  const matching = rules.filter((rule) => collectCourseCodes(rule.expression).includes(courseCode));
  if (matching.length === 0) return undefined;
  return matching.find((rule) => rule.verificationTier === "VERIFIED_ASSIST") ?? matching[0];
}
