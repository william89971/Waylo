import { describe, expect, it } from "vitest";
import { evaluateCalGetc } from "@/lib/articulation/cal-getc";
import { buildCounselorConfirmationItems } from "@/lib/articulation/counselor-confirmation";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import { productionStudentCatalog } from "@/lib/articulation/student-catalog";
import { rematchTranscriptRow, extractCoursesFromPlainText } from "@/lib/articulation/transcript-match";
import { computeMultiTargetPlan } from "@/lib/articulation/multi-target-plan";
import { targetMajorId } from "@/lib/articulation/types";
import type { ProductionCourse } from "@/lib/production-types";

function course(overrides: Partial<ProductionCourse>): ProductionCourse {
  return {
    id: overrides.id ?? "c1",
    catalogCourseId: overrides.catalogCourseId ?? "coc-engl-c1000",
    code: overrides.code ?? "ENGL C1000",
    title: overrides.title ?? "Academic Reading and Writing",
    units: overrides.units ?? 4,
    grade: overrides.grade ?? "A",
    term: overrides.term ?? "Fall 2025",
    status: overrides.status ?? "completed",
    matchStatus: overrides.matchStatus ?? "verified",
    source: overrides.source ?? "manual",
  };
}

describe("transcript rematch", () => {
  it("keeps equivalent COC numbers and leaves unknown rows unmatched", () => {
    const matched = rematchTranscriptRow({
      sourceCode: "ENGL C1000",
      sourceTitle: "Academic Reading and Writing",
      normalizedCourseId: "coc-math-211",
      units: 4,
      grade: "A",
      term: "Fall 2025",
      confidence: 0.9,
      reviewRequired: false,
      reviewReason: null,
    });
    expect(matched.normalizedCourseId).toBe("coc-engl-c1000");

    const unmatched = rematchTranscriptRow({
      sourceCode: "ANTH 101",
      sourceTitle: "Physical Anthropology",
      normalizedCourseId: "coc-engl-c1000",
      units: 3,
      grade: "B",
      term: "Fall 2025",
      confidence: 0.4,
      reviewRequired: false,
      reviewReason: null,
    });
    expect(unmatched.normalizedCourseId).toBeNull();
    expect(unmatched.reviewRequired).toBe(true);
  });

  it("records AP rows as pending credit, not as a COC class", () => {
    const row = rematchTranscriptRow({
      sourceCode: "AP Calculus AB",
      sourceTitle: "Advanced Placement Calculus AB",
      normalizedCourseId: "coc-math-211",
      units: 5,
      grade: "5",
      term: "High School",
      confidence: 0.8,
      reviewRequired: false,
      reviewReason: null,
    });
    expect(row.normalizedCourseId).toBe("ap:calc-ab");
    expect(row.reviewRequired).toBe(true);
  });

  it("covers extra COC catalog courses and AP exams without inventing listed prep", () => {
    const graph = getSeedArticulationGraph();
    expect(graph.courseById.has("coc-chem-201")).toBe(true);
    expect(graph.courseById.has("coc-soci-101")).toBe(true);
    const catalog = productionStudentCatalog();
    expect(catalog.some((item) => item.id === "coc-chem-201")).toBe(true);
    expect(catalog.some((item) => item.id === "ap:calc-ab")).toBe(true);
  });

  it("extracts only course codes present in the pasted text", () => {
    const extraction = extractCoursesFromPlainText("ENGL C1000 Academic Reading and Writing A Fall 2025");
    expect(extraction.courses.map((row) => row.sourceCode)).toEqual(["ENGL C1000"]);
    expect(extraction.courses.some((row) => /MATH 211|COMP SCI 111/i.test(row.sourceCode))).toBe(false);
    expect(extraction.courses[0]?.normalizedCourseId).toBe("coc-engl-c1000");
  });

  it("keeps unmatched and AP rows out of the College of the Canyons catalog", () => {
    const extraction = extractCoursesFromPlainText(
      "ANTH 101 Physical Anthropology B Fall 2024\nAP Calculus AB 5 High School",
    );
    const codes = extraction.courses.map((row) => row.sourceCode);
    expect(codes).toEqual(expect.arrayContaining(["ANTH 101", "AP Calculus AB"]));
    expect(extraction.courses.find((row) => row.sourceCode === "ANTH 101")?.normalizedCourseId).toBeNull();
    expect(extraction.courses.find((row) => row.sourceCode === "AP Calculus AB")?.normalizedCourseId).toBe("ap:calc-ab");
    expect(extraction.courses.find((row) => row.sourceCode === "AP Calculus AB")?.reviewRequired).toBe(true);
  });
});

describe("Cal-GETC and counselor confirmation", () => {
  const graph = getSeedArticulationGraph();

  it("never marks Cal-GETC as satisfied", () => {
    const standing = evaluateCalGetc(new Set(["ENGL-101", "MATH-140"]));
    expect(standing.every((area) => area.status === "confirm_possible" || area.status === "not_shown")).toBe(true);
    expect(standing.find((area) => area.areaId === "1a")?.status).toBe("confirm_possible");
    expect(standing.find((area) => area.areaId === "6")?.status).toBe("not_shown");
  });

  it("lists AP, unmatched, petitions, and unclear articulation as pending", () => {
    const plan = computeMultiTargetPlan({
      history: [{ courseId: "coc-engl-101", code: "ENGL-101", completed: true }],
      primaryTargetId: targetMajorId("usc", "business_administration"),
      maxUnitsPerTerm: 15,
      graph,
    });
    const items = buildCounselorConfirmationItems({
      courses: [
        course({}),
        course({
          id: "ap1",
          catalogCourseId: "ap:stats",
          code: "AP Statistics",
          title: "Advanced Placement Statistics",
          matchStatus: "uncertain",
          source: "ap",
        }),
        course({
          id: "ext1",
          catalogCourseId: "ext:pierce-engl-101",
          code: "ENGL 101",
          title: "College Reading (Pierce)",
          matchStatus: "uncertain",
          source: "other_college",
        }),
        course({
          id: "pet1",
          catalogCourseId: "petition:stat-sub",
          code: "Petition",
          title: "Substitute statistics",
          matchStatus: "uncertain",
          source: "petition",
        }),
      ],
      graph,
      plan,
    });
    expect(items.map((item) => item.kind)).toEqual(expect.arrayContaining(["ap_credit", "other_college", "petition", "unverified_articulation", "cal_getc"]));
    expect(items.every((item) => !/satisfied as fact/i.test(`${item.title} ${item.detail}`))).toBe(true);
  });

  it("does not surface internal production-baseline jargon as a counselor item", () => {
    const items = buildCounselorConfirmationItems({
      courses: [],
      graph,
      plan: computeMultiTargetPlan({
        history: [],
        primaryTargetId: targetMajorId("uc_san_diego", "data_science"),
        maxUnitsPerTerm: 15,
        graph,
      }),
      targets: [
        {
          id: targetMajorId("uc_san_diego", "data_science"),
          institutionId: "uc_san_diego",
          institutionName: "UC San Diego",
          major: "data_science",
          displayName: "Data Science",
          degree: "B.S.",
          coverageTier: "full",
          recognizesIgetc: true,
          ingestionTier: "1",
          constraintNotes: graph.targetMajorById.get(targetMajorId("uc_san_diego", "data_science"))?.constraintNotes ?? [],
        },
      ],
    });
    expect(items.map((item) => `${item.title} ${item.detail}`).join("\n")).not.toMatch(/production baseline/i);
  });
});
