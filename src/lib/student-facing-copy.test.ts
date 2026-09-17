import { describe, expect, it } from "vitest";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import { targetMajorId } from "@/lib/articulation/types";
import {
  formatCourseCode,
  formatGraphTargetLabel,
  formatMatrixCampusLabel,
  formatSelectableTargetLabel,
  planBucketLabel,
  requirementProgressLabel,
  alreadyDoneLine,
  courseCountsLine,
  courseWhySentence,
  isOfficialVerifiedSource,
  officialSourceLabel,
  studentFacingConstraintNotes,
  studentFacingDataRelease,
  targetCoverageNote,
} from "@/lib/student-facing-copy";
import type { SelectableTarget } from "@/lib/production-types";

const targets: SelectableTarget[] = [
  {
    id: "usc:business_administration",
    institutionId: "usc",
    institutionName: "University of Southern California",
    major: "business_administration",
    displayName: "Business Administration (Marshall)",
    degree: "B.S.B.A.",
    coverageTier: "reviewed",
    recognizesIgetc: false,
    ingestionTier: "1",
    constraintNotes: [],
  },
];

describe("student-facing copy", () => {
  const graph = getSeedArticulationGraph();

  it("names campuses in plain English instead of target ids", () => {
    expect(formatSelectableTargetLabel(targets, "usc:business_administration")).toBe(
      "University of Southern California Business Administration (Marshall)",
    );
    expect(formatGraphTargetLabel(graph, targetMajorId("usc", "business_administration"))).toBe(
      "University of Southern California Business Administration (Marshall)",
    );
    expect(formatMatrixCampusLabel(graph, targetMajorId("uc_berkeley", "economics"))).toBe("UCB Economics");
  });

  it("maps catalog ids to course codes", () => {
    expect(formatCourseCode(graph, "coc-bus-201")).toBe("BUS-201");
    expect(formatCourseCode(graph, "BUS-201")).toBe("BUS-201");
  });

  it("does not print the counselor placeholder as a missing course", () => {
    expect(
      requirementProgressLabel({
        satisfied: false,
        missingCourseCodes: ["NEEDS-COUNSELOR"],
        verificationTier: "NEEDS_COUNSELOR_CONFIRMATION",
      }),
    ).toBe("ask a counselor");
    expect(
      requirementProgressLabel({
        satisfied: true,
        missingCourseCodes: [],
        verificationTier: "VERIFIED_ASSIST",
      }),
    ).toBe("on this plan");
    expect(
      requirementProgressLabel({
        satisfied: true,
        historySatisfied: true,
        missingCourseCodes: [],
        verificationTier: "VERIFIED_ASSIST",
      }),
    ).toBe("you already finished this");
    expect(
      requirementProgressLabel({
        satisfied: false,
        missingCourseCodes: ["MATH-211"],
        verificationTier: "VERIFIED_ASSIST",
      }),
    ).toBe("still need MATH-211");
  });

  it("explains overlap the way a counselor would say it", () => {
    expect(courseCountsLine(["UC Berkeley Economics", "USC Business Administration (Marshall)"])).toBe(
      "Counts toward UC Berkeley Economics and USC Business Administration (Marshall)",
    );
    expect(planBucketLabel("secondary_divergence")).toBe("Needed only for a second school");
    expect(targetCoverageNote("reviewed")).toMatch(/Official UC\/CSU/);
    expect(
      courseWhySentence([
        { school: "UC Berkeley Economics", requirement: "Calculus I" },
        { school: "USC Business Administration (Marshall)", requirement: "Business Calculus" },
      ]),
    ).toBe("This covers Calculus I at UC Berkeley Economics and Business Calculus at USC Business Administration (Marshall).");
    expect(alreadyDoneLine("UC Berkeley Economics", ["Writing", "Statistics"])).toBe(
      "Writing and Statistics at UC Berkeley Economics are already done.",
    );
  });

  it("only labels a source official when it is verified, linked, and dated", () => {
    expect(
      isOfficialVerifiedSource({
        verificationTier: "VERIFIED_ASSIST",
        sourceUrl: "https://assist.org/",
        agreementYear: "2025-26",
      }),
    ).toBe(true);
    expect(
      isOfficialVerifiedSource({
        verificationTier: "VERIFIED_ASSIST",
        sourceUrl: "https://assist.org/",
      }),
    ).toBe(false);
    expect(
      isOfficialVerifiedSource({
        verificationTier: "PLANNING_SUGGESTION",
        sourceUrl: "https://waylo.local/archetypes/private",
        agreementYear: "2025-26",
      }),
    ).toBe(false);
    expect(officialSourceLabel("2025-26")).toBe("Official source · 2025-26");
    expect(studentFacingConstraintNotes(["Production baseline pathway.", "Complete major prep by the spring before fall matriculation."])).toEqual([
      "Complete major prep by the spring before fall matriculation.",
    ]);
  });

  it("never prints internal data-release ids to students", () => {
    expect(studentFacingDataRelease("ucsd-data-2026-review-needed")).toBe("ASSIST 2025-26");
    expect(studentFacingDataRelease("seed-articulation-2025-26.v1")).toBe("ASSIST 2025-26");
    expect(studentFacingDataRelease("multi-target-csp-v1")).toBe("ASSIST 2025-26");
  });
});
