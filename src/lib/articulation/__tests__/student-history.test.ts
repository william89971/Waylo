import { describe, expect, it } from "vitest";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import {
  courseClosesListedPrep,
  graphCodeForStudentCourse,
  unmatchedCompletedCourses,
} from "@/lib/articulation/student-history";

describe("student history mapping", () => {
  const graph = getSeedArticulationGraph();

  it("maps current COC common-course numbers onto the same articulation class", () => {
    expect(graphCodeForStudentCourse({ catalogCourseId: "coc-engl-c1000", code: "ENGL C1000" }, graph)).toBe("ENGL-101");
    expect(graphCodeForStudentCourse({ catalogCourseId: "coc-math-211", code: "MATH 211" }, graph)).toBe("MATH-211");
    expect(graphCodeForStudentCourse({ catalogCourseId: "coc-stat-c1000", code: "STAT C1000" }, graph)).toBe("MATH-140");
  });

  it("keeps unmatched and pending credit from closing listed prep", () => {
    expect(graphCodeForStudentCourse({ catalogCourseId: "ap:calc-ab", code: "AP Calculus AB" }, graph)).toBeUndefined();
    expect(graphCodeForStudentCourse({ catalogCourseId: "ext:pierce-engl-101", code: "ENGL 101" }, graph)).toBeUndefined();
    expect(
      courseClosesListedPrep(
        { catalogCourseId: "coc-soci-101", code: "SOCI 101", status: "completed" },
        graph,
      ),
    ).toBe(false);
    expect(
      unmatchedCompletedCourses(
        [
          { catalogCourseId: "coc-soci-101", code: "SOCI 101", title: "Introduction to Sociology", status: "completed" },
          { catalogCourseId: "coc-engl-c1000", code: "ENGL C1000", title: "Academic Reading and Writing", status: "completed" },
          { catalogCourseId: "ap:stats", code: "AP Statistics", title: "AP Statistics", status: "completed" },
        ],
        graph,
      ).map((course) => course.catalogCourseId),
    ).toEqual(["coc-soci-101", "ap:stats"]);
  });
});
