import { describe, expect, it } from "vitest";
import { buildAdmissionsStrategy, isPreferredTransferTerm } from "@/lib/admissions-strategy";
import type { SelectableTarget, StudentWorkspaceRecord } from "@/lib/production-types";

const targets: SelectableTarget[] = [
  {
    id: "uc_berkeley:economics",
    institutionId: "uc_berkeley",
    institutionName: "UC Berkeley",
    major: "economics",
    displayName: "Economics",
    degree: "B.A.",
    coverageTier: "reviewed",
    recognizesIgetc: true,
    ingestionTier: "1",
    constraintNotes: ["Complete major prep by the spring before fall matriculation."],
  },
  {
    id: "stanford:data_science",
    institutionId: "stanford",
    institutionName: "Stanford University",
    major: "data_science",
    displayName: "Data Science (Foundational Profile)",
    degree: "B.S.",
    coverageTier: "archetype",
    recognizesIgetc: false,
    ingestionTier: "2",
    constraintNotes: ["No formal ASSIST agreement. IGETC is not recognized."],
  },
];

function workspace(overrides: Partial<StudentWorkspaceRecord> = {}): StudentWorkspaceRecord {
  return {
    userId: "student-1",
    profile: {
      preferredName: "Student",
      currentTerm: null,
      onboardingStep: 4,
      onboardingCompleted: true,
    },
    courses: [
      {
        id: "c1",
        catalogCourseId: "coc-engl-c1000",
        code: "ENGL C1000",
        title: "Academic Reading and Writing",
        units: 4,
        grade: null,
        term: "Fall 2025",
        status: "completed",
        matchStatus: "verified",
      },
    ],
    pathwayId: "ucsd-data",
    primaryTargetId: "uc_berkeley:economics",
    secondaryTargetIds: [],
    includeSecondaryDivergence: true,
    coverageTier: "reviewed",
    preferences: {
      maxUnits: 15,
      summerEnrollment: false,
      weeklyWorkHours: 0,
      targetTerm: null,
    },
    ...overrides,
  };
}

describe("admissions strategy", () => {
  it("returns null until a valid plan exists", () => {
    expect(
      buildAdmissionsStrategy(workspace(), targets, {
        hasValidPlan: false,
        plannedCourseCodes: [],
        reviewItemCount: 0,
      }),
    ).toBeNull();
  });

  it("frames coursework first and activities as guidance, not an admissions formula", () => {
    const strategy = buildAdmissionsStrategy(workspace(), targets, {
      hasValidPlan: true,
      plannedCourseCodes: ["MATH-211", "COMP SCI 111"],
      reviewItemCount: 2,
    });
    expect(strategy).not.toBeNull();
    const text = [
      strategy!.grades.body,
      strategy!.activities.body,
      strategy!.counselor.items.join(" "),
      strategy!.teaser,
      strategy!.disclaimer,
    ].join(" ");
    expect(text).toMatch(/Economics at UC Berkeley/);
    expect(text).toMatch(/MATH-211/);
    expect(text).toMatch(/missing a grade/);
    expect(text).toMatch(/initiative/);
    expect(text).toMatch(/coherent personal story/);
    expect(text).toMatch(/officer titles/);
    expect(text).toMatch(/does not predict or guarantee admission/i);
    expect(text).not.toMatch(/stronger story than/i);
    expect(text).not.toMatch(/become president/i);
    expect(text).not.toMatch(/read the transcript first/i);
    expect(strategy!.counselor.items.some((item) => item.includes("Confirm this note"))).toBe(true);
    expect(strategy!.disclaimer).toMatch(/not verified articulation/i);
    expect(strategy!.disclaimer).toMatch(/not an admission prediction/i);
    for (const chunk of [strategy!.grades.body, strategy!.activities.body, strategy!.teaser]) {
      expect(chunk.toLowerCase()).not.toMatch(/\b(likely|competitive|guaranteed|odds)\b/);
    }
  });

  it("asks about planning-estimate campuses and IGETC as questions", () => {
    const strategy = buildAdmissionsStrategy(
      workspace({
        primaryTargetId: "stanford:data_science",
        courses: [],
      }),
      targets,
      { hasValidPlan: true, plannedCourseCodes: ["PSYCH 101"], reviewItemCount: 0 },
    );
    expect(strategy?.counselor.items.join(" ")).toMatch(/planning estimate/i);
    expect(strategy?.counselor.items.join(" ")).toMatch(/does not recognize IGETC/);
    expect(strategy?.counselor.items.join(" ")).toMatch(/No formal ASSIST agreement/);
  });

  it("accepts optional transfer terms in Fall|Spring|Summer YYYY form", () => {
    expect(isPreferredTransferTerm("Spring 2029")).toBe(true);
    expect(isPreferredTransferTerm("")).toBe(false);
    expect(isPreferredTransferTerm("soon")).toBe(false);
  });
});
