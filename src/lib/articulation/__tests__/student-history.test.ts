import { describe, expect, it } from "vitest";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import { graphCodeForStudentCourse, unmatchedCompletedCourses } from "@/lib/articulation/student-history";

describe("student history mapping", () => {
  const graph = getSeedArticulationGraph();

  it("maps current COC common-course numbers onto the same articulation class", () => {
    expect(graphCodeForStudentCourse({ catalogCourseId: "coc-engl-c1000", code: "ENGL C1000" }, graph)).toBe("ENGL-101");
    expect(graphCodeForStudentCourse({ catalogCourseId: "coc-math-211", code: "MATH 211" }, graph)).toBe("MATH-211");
    expect(graphCodeForStudentCourse({ catalogCourseId: "coc-stat-c1000", code: "STAT C1000" }, graph)).toBe("MATH-140");
  });

  it("does not invent a match for an unmatched catalog course", () => {
    expect(graphCodeForStudentCourse({ catalogCourseId: "coc-soci-101", code: "SOCI 101" }, graph)).toBeUndefined();
    expect(
      unmatchedCompletedCourses(
        [{ catalogCourseId: "coc-soci-101", code: "SOCI 101", title: "Introduction to Sociology", status: "completed" }],
        graph,
      ),
    ).toHaveLength(1);
  });
});
