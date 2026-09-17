import { collectCourseCodes, expandCandidateSets } from "@/lib/articulation/expression";
import type { ArticulationGraph, ArticulationRule } from "@/lib/articulation/types";
import { targetMajorId } from "@/lib/articulation/types";
import { isOfficialVerifiedSource, studentFacingDataRelease } from "@/lib/student-facing-copy";

const DEFAULT_TEASER_TARGET_ID = targetMajorId("uc_san_diego", "data_science");

export const LANDING_CTA_LABEL = "Build your semester list";
export const LANDING_SPECIMEN_TERM = "Fall 2026";
export const LANDING_SPECIMEN_CODES = ["MATH-211", "MATH-212", "ENGL-103"] as const;
export const LANDING_SPECIMEN_TARGET_IDS = [
  targetMajorId("ucla", "business_administration"),
  targetMajorId("uc_berkeley", "economics"),
] as const;

const PLACEHOLDER_COURSE_CODE = "NEEDS-COUNSELOR";
const PREVIEW_COURSE_LIMIT = 2;

export type LandingPreviewCourse = {
  code: string;
  title: string;
  units: number;
};

export type LandingMajorOption = {
  id: string;
  institutionId: string;
  major: string;
  courses: LandingPreviewCourse[];
};

export type LandingSchoolOption = {
  id: string;
  name: string;
};

export type LandingTeaserData = {
  schools: LandingSchoolOption[];
  majors: LandingMajorOption[];
  defaultTargetId: string;
};

export type LandingSpecimenCourse = {
  code: string;
  title: string;
  units: string;
  status: "verified" | "review";
  statusLabel: string;
  overlap: string | null;
  overlapLabel: string | null;
};

export type LandingSpecimen = {
  destination: string;
  term: string;
  unitsLabel: string;
  courses: LandingSpecimenCourse[];
};

function isOfficialRule(rule: ArticulationRule) {
  return isOfficialVerifiedSource({
    verificationTier: rule.verificationTier,
    sourceUrl: rule.sourceUrl,
    agreementYear: rule.effectiveYear,
  });
}

function previewCodeForRule(rule: ArticulationRule) {
  const preferred = expandCandidateSets(rule.expression)
    .flat()
    .find((code) => code !== PLACEHOLDER_COURSE_CODE);
  return preferred;
}

export function overlapSchoolCount(graph: ArticulationGraph, courseCode: string) {
  const institutionIds = new Set<string>();
  for (const rule of graph.rules) {
    if (!isOfficialRule(rule)) continue;
    if (!collectCourseCodes(rule.expression).includes(courseCode)) continue;
    const major = graph.targetMajorById.get(rule.targetMajorId);
    if (major) institutionIds.add(major.institutionId);
  }
  return institutionIds.size;
}

export function overlapTag(count: number) {
  if (count < 2) return null;
  return `${count} target schools`;
}

export function overlapAnnouncement(count: number) {
  if (count < 2) return null;
  return `Satisfies prereqs for ${count} target schools`;
}

function previewCoursesForMajor(graph: ArticulationGraph, targetMajorId: string, limit = PREVIEW_COURSE_LIMIT) {
  const courses: LandingPreviewCourse[] = [];
  const seen = new Set<string>();
  for (const rule of graph.rulesByTargetMajorId.get(targetMajorId) ?? []) {
    const code = previewCodeForRule(rule);
    if (!code || seen.has(code)) continue;
    const catalog = graph.courseByCode.get(code);
    if (!catalog) continue;
    seen.add(code);
    courses.push({
      code: catalog.code,
      title: catalog.title,
      units: catalog.semesterUnits,
    });
    if (courses.length >= limit) break;
  }
  return courses;
}

export function buildLandingTeaser(
  graph: ArticulationGraph,
  defaultTargetId = DEFAULT_TEASER_TARGET_ID,
): LandingTeaserData {
  const majors = graph.targetMajors
    .map((major) => ({
      id: major.id,
      institutionId: major.institutionId,
      major: major.displayName,
      courses: previewCoursesForMajor(graph, major.id),
    }))
    .filter((major) => major.courses.length > 0);

  const schoolIds = new Set(majors.map((major) => major.institutionId));
  const schools = graph.institutions
    .filter((institution) => schoolIds.has(institution.id))
    .map((institution) => ({ id: institution.id, name: institution.name }));

  const defaultExists = majors.some((major) => major.id === defaultTargetId);
  return {
    schools,
    majors,
    defaultTargetId: defaultExists ? defaultTargetId : (majors[0]?.id ?? ""),
  };
}

export function landingCoverageLine(graph: ArticulationGraph, dataRelease?: string) {
  const official = graph.institutions.filter((institution) => institution.ingestionTier === "1");
  const ucCount = official.filter((institution) => institution.id === "ucla" || institution.id.startsWith("uc_")).length;
  const hasUsc = official.some((institution) => institution.id === "usc");
  const release = studentFacingDataRelease(dataRelease ?? graph.releaseId);
  if (ucCount && hasUsc) return `${release} · ${ucCount} UCs and USC`;
  if (ucCount) return `${release} · ${ucCount} UCs`;
  return release;
}

function formatUnits(units: number) {
  return units.toFixed(1);
}

function courseStatus(graph: ArticulationGraph, courseCode: string): LandingSpecimenCourse["status"] {
  const official = graph.rules.some((rule) => isOfficialRule(rule) && collectCourseCodes(rule.expression).includes(courseCode));
  return official ? "verified" : "review";
}

export function buildLandingSpecimen(graph: ArticulationGraph): LandingSpecimen {
  const destination = LANDING_SPECIMEN_TARGET_IDS.map((id) => {
    const major = graph.targetMajorById.get(id);
    const institution = major
      ? graph.institutions.find((item) => item.id === major.institutionId)
      : undefined;
    if (!major || !institution) return "";
    return `${institution.name} ${major.displayName}`;
  })
    .filter(Boolean)
    .join(" & ");

  const courses = LANDING_SPECIMEN_CODES.flatMap((code) => {
    const catalog = graph.courseByCode.get(code);
    if (!catalog) return [];
    const schools = overlapSchoolCount(graph, catalog.code);
    const status = courseStatus(graph, catalog.code);
    return [{
      code: catalog.code,
      title: catalog.title,
      units: formatUnits(catalog.semesterUnits),
      status,
      statusLabel: status === "verified" ? "Official agreement" : "Ask a counselor",
      overlap: overlapTag(schools),
      overlapLabel: overlapAnnouncement(schools),
    }];
  });

  const totalUnits = courses.reduce((sum, course) => sum + Number(course.units), 0);
  return {
    destination: destination ? `Target: ${destination}` : "Target: UCLA & UC Berkeley — Economics",
    term: LANDING_SPECIMEN_TERM,
    unitsLabel: `${formatUnits(totalUnits)} COC units`,
    courses,
  };
}
