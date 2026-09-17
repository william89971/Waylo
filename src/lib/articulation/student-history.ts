import type { ArticulationGraph } from "@/lib/articulation/types";

/**
 * Common-course-number and catalog ids that do not match the articulation graph
 * one-for-one. Only map when the COC course is the same class under a new number.
 * Do not invent substitutions.
 */
const CATALOG_ID_TO_GRAPH_CODE: Record<string, string> = {
  "coc-engl-c1000": "ENGL-101",
  "coc-engl-c1001": "ENGL-103",
  "coc-stat-c1000": "MATH-140",
  "coc-compsci-111": "CMPSCI-111",
  "coc-compsci-182": "CMPSCI-182",
  "coc-psych-101": "PSYCH-101",
};

export function graphCodeForStudentCourse(
  course: { catalogCourseId: string; code: string },
  graph: ArticulationGraph,
): string | undefined {
  const fromId = graph.courseById.get(course.catalogCourseId);
  if (fromId) return fromId.code;

  const mapped = CATALOG_ID_TO_GRAPH_CODE[course.catalogCourseId];
  if (mapped && graph.courseByCode.has(mapped)) return mapped;

  const dashed = course.code.replace(/\s+/g, "-").toUpperCase();
  if (graph.courseByCode.has(dashed)) return dashed;

  return undefined;
}

export function unmatchedCompletedCourses(
  courses: Array<{ catalogCourseId: string; code: string; title: string; status: string }>,
  graph: ArticulationGraph,
) {
  return courses.filter(
    (course) => course.status === "completed" && !graphCodeForStudentCourse(course, graph),
  );
}
