import type { StudentCourse } from "@/lib/domain";

const gradeRank: Record<string, number> = {
  "A+": 13, A: 12, "A-": 11,
  "B+": 10, B: 9, "B-": 8,
  "C+": 7, C: 6, "C-": 5,
  "D+": 4, D: 3, "D-": 2, F: 1,
};

export function meetsMinimumGrade(grade: string | undefined, minimumGrade = "C-"): boolean {
  if (!grade) return false;
  if (grade === "P" || grade === "CR") return minimumGrade === "C-";
  return (gradeRank[grade.toUpperCase()] ?? 0) >= (gradeRank[minimumGrade.toUpperCase()] ?? Number.POSITIVE_INFINITY);
}

export function isVerifiedCompleted(course: StudentCourse, minimumGrade = "C-"): boolean {
  return course.status === "completed" && course.matchStatus === "verified" && meetsMinimumGrade(course.grade, minimumGrade);
}
