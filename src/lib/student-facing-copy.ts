import type { ArticulationGraph, VerificationTier } from "@/lib/articulation/types";
import type { SelectableTarget } from "@/lib/production-types";

const PLACEHOLDER_COURSE_CODES = new Set(["NEEDS-COUNSELOR"]);

export const VERIFICATION_EXPLAIN: Record<VerificationTier, string> = {
  VERIFIED_ASSIST: "Confirmed in an official ASSIST agreement.",
  VERIFIED_INSTITUTIONAL_GUIDE: "Confirmed in the university’s transfer guide.",
  HISTORICAL_PRECEDENT: "Based on past departmental practice — confirm with a counselor.",
  PLANNING_SUGGESTION: "A planning recommendation, not a verified articulation.",
  NEEDS_COUNSELOR_CONFIRMATION: "Uncertain. Ask a counselor before you enroll.",
};

export const VERIFICATION_SHORT: Record<VerificationTier, string> = {
  VERIFIED_ASSIST: "Verified ASSIST",
  VERIFIED_INSTITUTIONAL_GUIDE: "Institutional guide",
  HISTORICAL_PRECEDENT: "Historical precedent",
  PLANNING_SUGGESTION: "Planning suggestion",
  NEEDS_COUNSELOR_CONFIRMATION: "Needs counselor confirmation",
};

export function formatSelectableTargetLabel(
  targets: SelectableTarget[],
  targetId: string,
): string {
  const target = targets.find((item) => item.id === targetId);
  return target ? `${target.institutionName} ${target.displayName}` : targetId;
}

export function formatGraphTargetLabel(graph: ArticulationGraph, targetMajorId: string): string {
  const major = graph.targetMajorById.get(targetMajorId);
  const institution = major
    ? graph.institutions.find((item) => item.id === major.institutionId)
    : undefined;
  if (major && institution) return `${institution.name} ${major.displayName}`;
  return major?.displayName ?? targetMajorId;
}

export function formatMatrixCampusLabel(graph: ArticulationGraph, targetMajorId: string): string {
  const major = graph.targetMajorById.get(targetMajorId);
  const institution = major
    ? graph.institutions.find((item) => item.id === major.institutionId)
    : undefined;
  if (major && institution) return `${institution.code} ${major.displayName}`;
  return major?.displayName ?? targetMajorId;
}

export function formatCourseCode(graph: ArticulationGraph, courseIdOrCode: string): string {
  return graph.courseById.get(courseIdOrCode)?.code ?? graph.courseByCode.get(courseIdOrCode)?.code ?? courseIdOrCode;
}

export function requirementProgressLabel(requirement: {
  satisfied: boolean;
  missingCourseCodes: string[];
  verificationTier: VerificationTier;
}): string {
  if (requirement.satisfied) return "satisfied";
  const missing = requirement.missingCourseCodes.filter((code) => !PLACEHOLDER_COURSE_CODES.has(code));
  if (!missing.length) {
    return requirement.verificationTier === "NEEDS_COUNSELOR_CONFIRMATION"
      ? "needs counselor confirmation"
      : "not yet scheduled";
  }
  return `missing ${missing.join(", ")}`;
}
