import { collectCourseCodes } from "@/lib/articulation/expression";
import type {
  ArticulationGraph,
  ArticulationRule,
  MultiTargetPlanResult,
  ScheduledCourse,
  VerificationTier,
} from "@/lib/articulation/types";
import type {
  CourseEvidencePayload,
  EvidenceCampusEntry,
} from "@/components/evidence-drawer";
import type {
  MatrixCampusCell,
  MatrixCampusColumn,
  MatrixCourseRow,
} from "@/components/multi-campus-matrix";

const REVIEW_TIERS = new Set<VerificationTier>([
  "NEEDS_COUNSELOR_CONFIRMATION",
  "PLANNING_SUGGESTION",
  "HISTORICAL_PRECEDENT",
]);

function cellStatus(tier: VerificationTier | undefined): MatrixCampusCell["status"] {
  if (!tier) return "unrequired";
  if (REVIEW_TIERS.has(tier)) return "review";
  return "verified";
}

function compactEquivalency(rule: ArticulationRule | undefined): string | undefined {
  if (!rule) return undefined;
  const label = rule.label.trim();
  if (label.length > 0 && label.length <= 28 && /\d/.test(label)) {
    return label.toUpperCase();
  }
  return rule.requirementKey.replace(/_/g, " ").toUpperCase();
}

function pickRuleForCourse(
  rules: ArticulationRule[],
  courseCode: string,
): ArticulationRule | undefined {
  const matching = rules.filter((rule) =>
    collectCourseCodes(rule.expression).includes(courseCode),
  );
  if (matching.length === 0) return undefined;
  return matching.find((rule) => rule.verificationTier === "VERIFIED_ASSIST") ?? matching[0];
}

export function buildMatrixCampuses(
  plan: MultiTargetPlanResult,
  graph: ArticulationGraph,
): MatrixCampusColumn[] {
  const ids = [plan.primaryTargetId, ...plan.secondaryTargetIds];
  return ids.map((targetMajorId) => {
    const major = graph.targetMajorById.get(targetMajorId);
    return {
      targetMajorId,
      label: major?.displayName ?? targetMajorId,
      isPrimary: targetMajorId === plan.primaryTargetId,
    };
  });
}

export function buildMatrixRows(
  plan: MultiTargetPlanResult,
  graph: ArticulationGraph,
): MatrixCourseRow[] {
  const campusIds = [plan.primaryTargetId, ...plan.secondaryTargetIds];
  const rows: MatrixCourseRow[] = [];

  for (const term of plan.schedule.terms) {
    for (const course of term.courses) {
      const cells: Record<string, MatrixCampusCell> = {};
      for (const campusId of campusIds) {
        const fulfills = course.fulfillsTargetIds.includes(campusId);
        if (!fulfills) {
          cells[campusId] = { status: "unrequired" };
          continue;
        }
        const rule = pickRuleForCourse(
          graph.rulesByTargetMajorId.get(campusId) ?? [],
          course.code,
        );
        cells[campusId] = {
          status: cellStatus(course.verificationTier),
          equivalency: compactEquivalency(rule),
          verificationTier: course.verificationTier,
        };
      }
      rows.push({
        courseCode: course.code,
        title: course.title,
        semesterUnits: course.semesterUnits,
        termLabel: term.label,
        cells,
      });
    }
  }

  return rows;
}

function campusEntryForCourse(
  course: ScheduledCourse,
  campusId: string,
  isPrimary: boolean,
  graph: ArticulationGraph,
): EvidenceCampusEntry {
  const major = graph.targetMajorById.get(campusId);
  const fulfills = course.fulfillsTargetIds.includes(campusId);
  if (!fulfills) {
    return {
      targetMajorId: campusId,
      campusLabel: major?.displayName ?? campusId,
      isPrimary,
      required: false,
    };
  }

  const rule = pickRuleForCourse(
    graph.rulesByTargetMajorId.get(campusId) ?? [],
    course.code,
  );
  return {
    targetMajorId: campusId,
    campusLabel: major?.displayName ?? campusId,
    isPrimary,
    required: true,
    destinationRequirement: rule?.label ?? rule?.requirementKey,
    verificationTier: course.verificationTier,
    sourceType: rule?.sourceType,
    sourceUrl: rule?.sourceUrl,
    agreementYear: rule?.effectiveYear,
    notes: course.evidenceNotes[0] ?? rule?.notes,
  };
}

export function buildEvidenceByCourseCode(
  plan: MultiTargetPlanResult,
  graph: ArticulationGraph,
): Record<string, CourseEvidencePayload> {
  const campusIds = [plan.primaryTargetId, ...plan.secondaryTargetIds];
  const byCode: Record<string, CourseEvidencePayload> = {};

  for (const term of plan.schedule.terms) {
    for (const course of term.courses) {
      byCode[course.code] = {
        courseCode: course.code,
        courseTitle: course.title,
        semesterUnits: course.semesterUnits,
        campuses: campusIds.map((campusId) =>
          campusEntryForCourse(
            course,
            campusId,
            campusId === plan.primaryTargetId,
            graph,
          ),
        ),
      };
    }
  }

  return byCode;
}
