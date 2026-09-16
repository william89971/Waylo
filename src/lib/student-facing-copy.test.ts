import { describe, expect, it } from "vitest";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import { targetMajorId } from "@/lib/articulation/types";
import {
  formatCourseCode,
  formatGraphTargetLabel,
  formatMatrixCampusLabel,
  formatSelectableTargetLabel,
  requirementProgressLabel,
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
    ).toBe("needs counselor confirmation");
    expect(
      requirementProgressLabel({
        satisfied: true,
        missingCourseCodes: [],
        verificationTier: "VERIFIED_ASSIST",
      }),
    ).toBe("satisfied");
  });
});
