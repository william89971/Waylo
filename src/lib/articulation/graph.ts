import {
  ARTICULATION_RULE_SEED,
  COC_CATALOG_SEED,
  INSTITUTION_SEED,
  PREREQUISITE_SEED,
  SEED_RELEASE_ID,
  TARGET_MAJOR_SEED,
} from "@/lib/articulation/seed-data";
import type { ArticulationGraph, ArticulationRule } from "@/lib/articulation/types";

export function indexGraph(
  input: Omit<
    ArticulationGraph,
    "courseById" | "courseByCode" | "targetMajorById" | "rulesByTargetMajorId"
  >,
): ArticulationGraph {
  const courseById = new Map(input.courses.map((course) => [course.id, course]));
  const courseByCode = new Map(input.courses.map((course) => [course.code, course]));
  const targetMajorById = new Map(input.targetMajors.map((major) => [major.id, major]));
  const rulesByTargetMajorId = new Map<string, ArticulationRule[]>();
  for (const rule of input.rules) {
    const list = rulesByTargetMajorId.get(rule.targetMajorId) ?? [];
    list.push(rule);
    rulesByTargetMajorId.set(rule.targetMajorId, list);
  }
  return { ...input, courseById, courseByCode, targetMajorById, rulesByTargetMajorId };
}

export function buildArticulationGraphFromSeed(releaseId = SEED_RELEASE_ID): ArticulationGraph {
  return indexGraph({
    releaseId,
    institutions: INSTITUTION_SEED,
    courses: COC_CATALOG_SEED,
    targetMajors: TARGET_MAJOR_SEED,
    rules: ARTICULATION_RULE_SEED,
    prerequisites: PREREQUISITE_SEED,
  });
}

let cachedSeedGraph: ArticulationGraph | undefined;

export function getSeedArticulationGraph(): ArticulationGraph {
  if (!cachedSeedGraph) cachedSeedGraph = buildArticulationGraphFromSeed();
  return cachedSeedGraph;
}
