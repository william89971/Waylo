import { collectCourseCodes } from "@/lib/articulation/expression";
import type { ArticulationGraph } from "@/lib/articulation/types";

/**
 * Common-course-number and catalog ids that do not match the articulation graph
 * one-for-one. Only map when the COC course is the same class under a new number.
 * Do not invent substitutions.
 */
export const CATALOG_ID_TO_GRAPH_CODE: Record<string, string> = {
  "coc-engl-c1000": "ENGL-101",
  "coc-engl-c1001": "ENGL-103",
  "coc-stat-c1000": "MATH-140",
  "coc-compsci-111": "CMPSCI-111",
  "coc-compsci-182": "CMPSCI-182",
  "coc-psych-101": "PSYCH-101",
};

export function listedRequirementCodes(graph: ArticulationGraph): Set<string> {
  return new Set(graph.rules.flatMap((rule) => collectCourseCodes(rule.expression)));
}

export function preferredCatalogIdForGraphCode(graphCode: string, graph: ArticulationGraph): string | undefined {
  const preferred = Object.entries(CATALOG_ID_TO_GRAPH_CODE).find(([, code]) => code === graphCode)?.[0];
  if (preferred) return preferred;
  return graph.courseByCode.get(graphCode)?.id;
}

export function graphCodeForStudentCourse(
  course: { catalogCourseId: string; code: string },
  graph: ArticulationGraph,
): string | undefined {
  const mapped = CATALOG_ID_TO_GRAPH_CODE[course.catalogCourseId];
  if (mapped && graph.courseByCode.has(mapped)) return mapped;

  if (
    course.catalogCourseId.startsWith("ap:") ||
    course.catalogCourseId.startsWith("ext:") ||
    course.catalogCourseId.startsWith("petition:")
  ) {
    return undefined;
  }

  const fromId = graph.courseById.get(course.catalogCourseId);
  if (fromId) return fromId.code;

  const dashed = course.code.replace(/\s+/g, "-").toUpperCase();
  if (graph.courseByCode.has(dashed)) return dashed;

  return undefined;
}

export function courseClosesListedPrep(
  course: { catalogCourseId: string; code: string; status: string },
  graph: ArticulationGraph,
): boolean {
  if (course.status !== "completed") return false;
  const code = graphCodeForStudentCourse(course, graph);
  if (!code) return false;
  return listedRequirementCodes(graph).has(code);
}

export function unmatchedCompletedCourses(
  courses: Array<{ catalogCourseId: string; code: string; title: string; status: string }>,
  graph: ArticulationGraph,
) {
  return courses.filter((course) => course.status === "completed" && !courseClosesListedPrep(course, graph));
}
