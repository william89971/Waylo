import { evidence } from "@/lib/academic-data";
import { planningEngine } from "@/lib/planning-engine";
import type { StudentProfile } from "@/lib/domain";
import type { StudentWorkspaceRecord } from "@/lib/production-types";

export const WAYLO_ALGORITHM_VERSION = "planning-engine-v1";
export const UCSD_DATA_RELEASE = "ucsd-data-2026-review-needed";

export function toStudentProfile(workspace: StudentWorkspaceRecord): StudentProfile {
  return {
    id: workspace.userId,
    name: workspace.profile.preferredName,
    originInstitutionId: "coc",
    originInstitutionName: "College of the Canyons",
    selectedPathwayId: "ucsd-data",
    selectedPathwayIds: ["ucsd-data"],
    maxUnits: workspace.preferences.maxUnits,
    summerEnrollment: workspace.preferences.summerEnrollment,
    courses: workspace.courses.map((course) => ({
      courseId: course.catalogCourseId,
      code: course.code,
      title: course.title,
      units: course.units,
      grade: course.grade ?? undefined,
      term: course.term,
      status: course.status === "completed" ? "completed" : "planned",
      matchStatus: course.matchStatus,
      sourceLabel: "Student-confirmed course entry",
    })),
  };
}

export function generateProductionPlan(workspace: StudentWorkspaceRecord) {
  const profile = toStudentProfile(workspace);
  return planningEngine.buildPlan(profile, "ucsd-data", {
    includeSummer: workspace.preferences.summerEnrollment,
    summerCourseLimit: workspace.preferences.summerEnrollment ? 1 : 0,
    maxUnits: workspace.preferences.maxUnits,
    weeklyWorkHours: workspace.preferences.weeklyWorkHours,
    transferTarget: workspace.preferences.targetTerm ?? undefined,
    targetPolicy: workspace.preferences.targetTerm ? "preferred" : undefined,
  });
}

export function productionEvidenceState() {
  const applicable = evidence.filter((item) => item.pathwayId === "ucsd-data" || item.institutionId === "coc");
  return applicable.some((item) => item.status !== "verified") ? "needs_review" as const : "verified" as const;
}
