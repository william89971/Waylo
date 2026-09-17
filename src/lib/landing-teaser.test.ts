import { describe, expect, it } from "vitest";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import { SEED_RELEASE_ID } from "@/lib/articulation/seed-data";
import { targetMajorId } from "@/lib/articulation/types";
import {
  buildLandingSpecimen,
  buildLandingTeaser,
  landingCoverageLine,
  overlapAnnouncement,
  overlapSchoolCount,
  overlapTag,
} from "@/lib/landing-teaser";

describe("landing teaser", () => {
  const graph = getSeedArticulationGraph();

  it("previews two real courses for UC San Diego Data Science", () => {
    const teaser = buildLandingTeaser(graph);
    const major = teaser.majors.find((item) => item.id === targetMajorId("uc_san_diego", "data_science"));
    expect(teaser.defaultTargetId).toBe(targetMajorId("uc_san_diego", "data_science"));
    expect(major?.courses.map((course) => course.code)).toEqual(["MATH-211", "MATH-212"]);
    expect(teaser.majors.some((item) => /computer science/i.test(item.major))).toBe(false);
  });

  it("uses one course from an OR rule so USC Marshall does not list both calculus options", () => {
    const teaser = buildLandingTeaser(graph);
    const major = teaser.majors.find((item) => item.id === targetMajorId("usc", "business_administration"));
    expect(major?.courses.map((course) => course.code)).toEqual(["MATH-211", "ECON-201"]);
  });

  it("omits majors that have no mapped courses", () => {
    const teaser = buildLandingTeaser(graph);
    expect(teaser.majors.some((item) => item.id === targetMajorId("ucla", "data_science"))).toBe(false);
    expect(teaser.schools.some((item) => item.id === "ucla")).toBe(true);
  });

  it("counts official overlap by school, not by repeating the same campus", () => {
    expect(overlapSchoolCount(graph, "MATH-211")).toBe(4);
    expect(overlapSchoolCount(graph, "MATH-212")).toBe(3);
    expect(overlapSchoolCount(graph, "CHEM-201")).toBe(1);
    expect(overlapTag(4)).toBe("4 target schools");
    expect(overlapAnnouncement(4)).toBe("Satisfies prereqs for 4 target schools");
    expect(overlapTag(1)).toBeNull();
  });

  it("does not invent 2026-27 or system-wide UC/CSU coverage", () => {
    expect(landingCoverageLine(graph, SEED_RELEASE_ID)).toBe("ASSIST 2025-26 · 3 UCs and USC");
    expect(landingCoverageLine(graph, SEED_RELEASE_ID)).not.toMatch(/2026/);
    expect(landingCoverageLine(graph, SEED_RELEASE_ID)).not.toMatch(/CSU/);
  });

  it("labels the specimen with real UCLA and Berkeley destinations", () => {
    const specimen = buildLandingSpecimen(graph);
    expect(specimen.destination).toBe("Target: UCLA Pre-Business Economics & UC Berkeley Economics");
    expect(specimen.unitsLabel).toBe("13.0 COC units");
    expect(specimen.courses.map((course) => course.code)).toEqual(["MATH-211", "MATH-212", "ENGL-103"]);
    expect(specimen.courses[0]?.overlapLabel).toBe("Satisfies prereqs for 4 target schools");
    expect(specimen.courses[1]?.overlapLabel).toBe("Satisfies prereqs for 3 target schools");
    expect(specimen.courses[2]?.overlap).toBeNull();
  });
});
