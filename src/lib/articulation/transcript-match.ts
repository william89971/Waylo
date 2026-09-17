import { courses as academicCourses } from "@/lib/academic-data";
import { AP_EXAMS } from "@/lib/articulation/external-credit";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import { preferredCatalogIdForGraphCode } from "@/lib/articulation/student-history";
import type { ArticulationGraph } from "@/lib/articulation/types";
import type { TranscriptCourse, TranscriptExtraction } from "@/lib/domain";

function normalizeCode(value: string) {
  return value.replace(/\s+/g, "-").replace(/_/g, "-").toUpperCase();
}

function catalogByLooseCode() {
  const map = new Map<string, (typeof academicCourses)[number]>();
  for (const course of academicCourses) {
    map.set(normalizeCode(course.code), course);
    map.set(normalizeCode(course.id.replace(/^coc-/, "")), course);
  }
  return map;
}

function matchApExam(sourceCode: string, sourceTitle: string) {
  const haystack = `${sourceCode} ${sourceTitle}`.toUpperCase();
  if (!/\bAP\b/.test(haystack) && !haystack.includes("ADVANCED PLACEMENT")) return undefined;
  return AP_EXAMS.find((exam) => {
    const needle = exam.code.replace(/^AP\s+/i, "").toUpperCase();
    return haystack.includes(needle);
  });
}

/**
 * AI may propose a catalog id. Only keep it when the visible source code
 * actually belongs to that College of the Canyons class.
 */
export function rematchTranscriptExtraction(
  extraction: TranscriptExtraction,
  graph: ArticulationGraph = getSeedArticulationGraph(),
): TranscriptExtraction {
  const byCode = catalogByLooseCode();
  const courses = extraction.courses.map((row) => rematchTranscriptRow(row, byCode, graph));
  return {
    ...extraction,
    courses,
    reviewFlags: [
      ...extraction.reviewFlags,
      ...courses
        .filter((row) => !row.normalizedCourseId)
        .map((row) => `${row.sourceCode} did not match a College of the Canyons class. It stays unmatched until a counselor confirms it.`),
    ].filter((flag, index, list) => list.indexOf(flag) === index),
  };
}

export function rematchTranscriptRow(
  row: TranscriptCourse,
  byCode = catalogByLooseCode(),
  graph: ArticulationGraph = getSeedArticulationGraph(),
): TranscriptCourse {
  const ap = matchApExam(row.sourceCode, row.sourceTitle);
  if (ap) {
    return {
      ...row,
      normalizedCourseId: ap.id,
      reviewRequired: true,
      reviewReason: "AP credit is pending. A counselor or the university has to confirm it before it can satisfy a requirement.",
    };
  }

  const fromCode = byCode.get(normalizeCode(row.sourceCode));
  if (fromCode) {
    return {
      ...row,
      normalizedCourseId: fromCode.id,
      reviewRequired: row.reviewRequired,
      reviewReason: row.reviewReason,
    };
  }

  const dashed = normalizeCode(row.sourceCode);
  if (graph.courseByCode.has(dashed)) {
    const preferredId = preferredCatalogIdForGraphCode(dashed, graph) ?? graph.courseByCode.get(dashed)!.id;
    return { ...row, normalizedCourseId: preferredId };
  }

  return {
    ...row,
    normalizedCourseId: null,
    reviewRequired: true,
    reviewReason: row.reviewReason ?? "No College of the Canyons match. Keep unmatched until a counselor confirms it.",
  };
}

export function externalCatalogId(sourceCode: string, sourceTitle: string) {
  const slug = normalizeCode(`${sourceCode}-${sourceTitle}`).replace(/[^A-Z0-9-]/g, "").slice(0, 48);
  return `ext:${slug || "unmatched"}`;
}
