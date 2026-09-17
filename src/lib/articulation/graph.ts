import { courses as academicCourses } from "@/lib/academic-data";
import {
  ARTICULATION_RULE_SEED,
  COC_CATALOG_SEED,
  INSTITUTION_SEED,
  PREREQUISITE_SEED,
  SEED_RELEASE_ID,
  TARGET_MAJOR_SEED,
} from "@/lib/articulation/seed-data";
import type { ArticulationGraph, ArticulationRule, CatalogCourse } from "@/lib/articulation/types";

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

function extraCocCatalog(): CatalogCourse[] {
  const existing = new Set(COC_CATALOG_SEED.map((course) => course.id));
  return academicCourses
    .filter((course) => course.institutionId === "coc" && !existing.has(course.id))
    .map((course) => ({
      id: course.id,
      code: course.code.replace(/\s+/g, "-").toUpperCase(),
      title: course.title,
      semesterUnits: course.units,
      category: course.category,
      prerequisites: course.prerequisites,
      offeredTerms: course.offeredTerms,
    }));
}

export function buildArticulationGraphFromSeed(releaseId = SEED_RELEASE_ID): ArticulationGraph {
  return indexGraph({
    releaseId,
    institutions: INSTITUTION_SEED,
    courses: [...COC_CATALOG_SEED, ...extraCocCatalog()],
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
