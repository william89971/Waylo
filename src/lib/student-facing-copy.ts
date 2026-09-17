import type { ArticulationGraph, ArticulationSourceType, VerificationTier } from "@/lib/articulation/types";
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
  VERIFIED_ASSIST: "Official agreement",
  VERIFIED_INSTITUTIONAL_GUIDE: "University guide",
  HISTORICAL_PRECEDENT: "Past practice — confirm",
  PLANNING_SUGGESTION: "Planning suggestion",
  NEEDS_COUNSELOR_CONFIRMATION: "Ask a counselor",
};

export function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function targetCoverageNote(coverageTier: SelectableTarget["coverageTier"]): string {
  if (coverageTier === "reviewed" || coverageTier === "full") {
    return "Official UC/CSU transfer agreement";
  }
  return "Estimate only — confirm with this university";
}

export function planBucketLabel(bucket?: string): string {
  if (bucket === "core_overlap") return "Counts at more than one school";
  if (bucket === "primary_mandate") return "Needed for your first-choice school";
  if (bucket === "secondary_divergence") return "Needed only for a second school";
  return "On your plan";
}

export function courseCountsLine(schoolLabels: string[]): string {
  if (schoolLabels.length > 1) return `Counts toward ${formatList(schoolLabels)}`;
  if (schoolLabels.length === 1) return `Needed for ${schoolLabels[0]}`;
  return "Not required by your first-choice school";
}

export function courseWhySentence(parts: Array<{ school: string; requirement?: string }>): string {
  if (!parts.length) return "Not required by your first-choice school.";
  const named = parts.filter((part) => part.requirement);
  if (named.length === parts.length) {
    if (parts.length === 1) return `This is ${parts[0].requirement} for ${parts[0].school}.`;
    return `This covers ${formatList(parts.map((part) => `${part.requirement} at ${part.school}`))}.`;
  }
  return `${courseCountsLine(parts.map((part) => part.school))}.`;
}

export function alreadyDoneLine(school: string, requirementLabels: string[]): string {
  if (!requirementLabels.length) return "";
  if (requirementLabels.length === 1) return `${requirementLabels[0]} at ${school} is already done.`;
  return `${formatList(requirementLabels)} at ${school} are already done.`;
}

export function isOfficialVerifiedSource(input: {
  verificationTier?: VerificationTier;
  sourceUrl?: string;
  agreementYear?: string;
}) {
  const verified =
    input.verificationTier === "VERIFIED_ASSIST" || input.verificationTier === "VERIFIED_INSTITUTIONAL_GUIDE";
  return Boolean(verified && input.sourceUrl && input.agreementYear);
}

export function officialSourceLabel(agreementYear: string) {
  return `Official source · ${agreementYear}`;
}

export function studentFacingConstraintNotes(notes: string[]) {
  return notes.filter((note) => !/production baseline/i.test(note.trim()));
}

export function studentFacingDataRelease(_version?: string) {
  return "ASSIST 2025-26";
}

export const SOURCE_TYPE_LABEL: Record<ArticulationSourceType, string> = {
  assist_public: "Official ASSIST agreement",
  institutional_guide: "University transfer guide",
  departmental_precedent: "Department practice — confirm",
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
  historySatisfied?: boolean;
  missingCourseCodes: string[];
  verificationTier: VerificationTier;
}): string {
  if (requirement.historySatisfied) return "you already finished this";
  if (requirement.satisfied) return "on this plan";
  const missing = requirement.missingCourseCodes.filter((code) => !PLACEHOLDER_COURSE_CODES.has(code));
  if (!missing.length) {
    return requirement.verificationTier === "NEEDS_COUNSELOR_CONFIRMATION"
      ? "ask a counselor"
      : "not yet scheduled";
  }
  return `still need ${missing.join(", ")}`;
}
