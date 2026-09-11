import { evidence } from "@/lib/academic-data";
import { computeMultiTargetPlan } from "@/lib/articulation/multi-target-plan";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import { targetMajorId } from "@/lib/articulation/types";
import { planningEngine } from "@/lib/planning-engine";
import type { StudentProfile } from "@/lib/domain";
import type { SelectableTarget, StudentWorkspaceRecord } from "@/lib/production-types";

export const WAYLO_ALGORITHM_VERSION = "planning-engine-v1";
export const UCSD_DATA_RELEASE = "ucsd-data-2026-review-needed";
export const MULTI_TARGET_DATA_RELEASE = "seed-articulation-2025-26.v1";

export const DEFAULT_PRIMARY_TARGET_ID = targetMajorId("uc_san_diego", "data_science");

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

export function generateMultiTargetProductionPlan(workspace: StudentWorkspaceRecord) {
  const graph = getSeedArticulationGraph();
  const primaryTargetId = workspace.primaryTargetId || DEFAULT_PRIMARY_TARGET_ID;
  const secondaryTargetIds = workspace.secondaryTargetIds ?? [];
  const history = workspace.courses.map((course) => ({
    courseId: course.catalogCourseId,
    code: graph.courseById.get(course.catalogCourseId)?.code
      ?? course.code.replace(/\s+/g, "-").toUpperCase(),
    completed: course.status === "completed",
  }));

  return computeMultiTargetPlan({
    history,
    primaryTargetId,
    secondaryTargetIds,
    maxUnitsPerTerm: workspace.preferences.maxUnits,
    includeSecondaryDivergence: workspace.includeSecondaryDivergence,
    includeSummer: workspace.preferences.summerEnrollment,
    graph,
  });
}

export function productionEvidenceState() {
  const applicable = evidence.filter((item) => item.pathwayId === "ucsd-data" || item.institutionId === "coc");
  return applicable.some((item) => item.status !== "verified") ? "needs_review" as const : "verified" as const;
}

export function listSelectableTargets(): SelectableTarget[] {
  const graph = getSeedArticulationGraph();
  return graph.targetMajors.map((major) => {
    const institution = graph.institutions.find((item) => item.id === major.institutionId);
    return {
      id: major.id,
      institutionId: major.institutionId,
      institutionName: institution?.name ?? major.institutionId,
      major: major.major,
      displayName: major.displayName,
      degree: major.degree,
      coverageTier: major.coverageTier,
      recognizesIgetc: institution?.recognizesIgetc ?? false,
      ingestionTier: institution?.ingestionTier ?? "2",
      constraintNotes: major.constraintNotes,
    };
  });
}

/** Prefer the legacy UCSD planner when only the reviewed UCSD Data Science target is selected. */
export function shouldUseLegacyUcsdPlanner(workspace: StudentWorkspaceRecord): boolean {
  const primary = workspace.primaryTargetId || DEFAULT_PRIMARY_TARGET_ID;
  return primary === DEFAULT_PRIMARY_TARGET_ID && (workspace.secondaryTargetIds?.length ?? 0) === 0;
}
