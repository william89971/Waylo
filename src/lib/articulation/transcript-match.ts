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

const SKIP_SUBJECTS = new Set([
  "FALL",
  "SPRING",
  "SUMMER",
  "WINTER",
  "GRADE",
  "UNITS",
  "UNIT",
  "TERM",
  "GPA",
  "TOTAL",
  "PAGE",
  "HIGH",
  "SCHOOL",
  "CREDIT",
  "CREDITS",
]);

function codePattern(code: string) {
  const parts = code
    .replace(/-/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b${parts.join("\\s+")}\\b`, "gi");
}

function nearbyMeta(text: string, index: number, length: number) {
  const window = text.slice(Math.max(0, index - 48), Math.min(text.length, index + length + 96));
  const term = window.match(/\b((?:Fall|Spring|Summer)\s+\d{4}|High School)\b/i)?.[1] ?? "Term not shown";
  const grade = window.match(/\b(A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F|P|CR|[1-5])\b/)?.[1] ?? null;
  return { term, grade };
}

function rangesOverlap(occupied: Array<[number, number]>, start: number, end: number) {
  return occupied.some(([from, to]) => start < to && end > from);
}

/**
 * Read only course codes that appear in the student's paste.
 * Never invent the seeded demo transcript (MATH 211 / COMP SCI 111) as their record.
 */
export function extractCoursesFromPlainText(
  text: string,
  graph: ArticulationGraph = getSeedArticulationGraph(),
): TranscriptExtraction {
  const occupied: Array<[number, number]> = [];
  const courses: TranscriptCourse[] = [];

  const take = (
    start: number,
    end: number,
    row: TranscriptCourse,
  ) => {
    if (rangesOverlap(occupied, start, end)) return;
    occupied.push([start, end]);
    courses.push(row);
  };

  for (const exam of [...AP_EXAMS].sort((left, right) => right.code.length - left.code.length)) {
    const found =
      codePattern(exam.code).exec(text) ??
      (/\bAP\b|ADVANCED PLACEMENT/i.test(text) ? codePattern(exam.code.replace(/^AP\s+/i, "")).exec(text) : null);
    if (!found) continue;
    const meta = nearbyMeta(text, found.index, found[0].length);
    take(found.index, found.index + found[0].length, {
      sourceCode: exam.code,
      sourceTitle: exam.title,
      normalizedCourseId: exam.id,
      units: 1,
      grade: meta.grade,
      term: meta.term,
      confidence: 0.86,
      reviewRequired: true,
      reviewReason: "AP credit is pending. A counselor or the university has to confirm it before it can satisfy a requirement.",
    });
  }

  const catalog = [
    ...academicCourses.map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      units: course.units,
    })),
    ...[...graph.courses]
      .filter((course) => !academicCourses.some((item) => item.id === course.id))
      .map((course) => ({
        id: course.id,
        code: course.code.replace(/-/g, " "),
        title: course.title,
        units: course.semesterUnits,
      })),
  ].sort((left, right) => right.code.length - left.code.length);

  for (const course of catalog) {
    const pattern = codePattern(course.code);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const meta = nearbyMeta(text, match.index, match[0].length);
      take(match.index, match.index + match[0].length, {
        sourceCode: course.code,
        sourceTitle: course.title,
        normalizedCourseId: course.id,
        units: course.units,
        grade: meta.grade,
        term: meta.term,
        confidence: 0.9,
        reviewRequired: false,
        reviewReason: null,
      });
    }
  }

  const unknown = /\b([A-Z]{2,6}(?:\s+[A-Z]{2,6}){0,2})\s+([A-Z]?\d{2,4}[A-Z]?)\b/g;
  let unknownMatch: RegExpExecArray | null;
  while ((unknownMatch = unknown.exec(text))) {
    const subject = unknownMatch[1].toUpperCase();
    if (SKIP_SUBJECTS.has(subject) || subject.split(/\s+/).some((part) => SKIP_SUBJECTS.has(part))) continue;
    const meta = nearbyMeta(text, unknownMatch.index, unknownMatch[0].length);
    take(unknownMatch.index, unknownMatch.index + unknownMatch[0].length, {
      sourceCode: `${unknownMatch[1]} ${unknownMatch[2]}`.replace(/\s+/g, " "),
      sourceTitle: "Unmatched coursework",
      normalizedCourseId: null,
      units: 1,
      grade: meta.grade,
      term: meta.term,
      confidence: 0.4,
      reviewRequired: true,
      reviewReason: "No College of the Canyons match. Keep unmatched until a counselor confirms it.",
    });
  }

  const reviewFlags = courses.length
    ? courses
        .filter((row) => !row.normalizedCourseId)
        .map((row) => `${row.sourceCode} did not match a College of the Canyons class. It stays unmatched until a counselor confirms it.`)
    : ["No course codes were found in the pasted text. Add classes by hand or paste lines that include course codes."];

  return rematchTranscriptExtraction({
    sourceType: "text",
    overallConfidence: courses.length ? 0.82 : 0,
    reviewFlags,
    courses,
  });
}
