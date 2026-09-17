import { collectCourseCodes, evaluateExpression, expandCandidateSets } from "@/lib/articulation/expression";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import type {
  ArticulationGraph,
  ArticulationRule,
  CourseBucket,
  DivergencePoint,
  MultiTargetPlanResult,
  PlanSchedule,
  ScheduledCourse,
  ScheduleTerm,
  TargetAuditSummary,
  VerificationTier,
} from "@/lib/articulation/types";
import { articulatedUnitsForAudit, juniorStandingThreshold } from "@/lib/articulation/units";
import { formatGraphTargetLabel } from "@/lib/student-facing-copy";

export const MULTI_TARGET_ALGORITHM_VERSION = "multi-target-csp-v1";

export interface AcademicHistoryCourse {
  courseId?: string;
  code: string;
  completed: boolean;
}

export interface MultiTargetPlanInput {
  history: AcademicHistoryCourse[];
  primaryTargetId: string;
  secondaryTargetIds?: string[];
  maxUnitsPerTerm?: number;
  includeSecondaryDivergence?: boolean;
  includeSummer?: boolean;
  startSeason?: "fall" | "spring";
  startYear?: number;
  graph?: ArticulationGraph;
  /** Graph course codes the student cannot take in the first packed term. Later terms may still schedule them. */
  unavailableNextTermCodes?: string[];
}

interface CandidateCourse {
  courseId: string;
  code: string;
  title: string;
  semesterUnits: number;
  prerequisites: string[];
  offeredTerms: Array<"fall" | "spring" | "summer">;
  targetIds: string[];
  verificationTier: VerificationTier;
  evidenceNotes: string[];
  weight: number;
  bucket: CourseBucket;
  excessElectiveForTargets: string[];
}

const TIER_RANK: Record<VerificationTier, number> = {
  VERIFIED_ASSIST: 0,
  VERIFIED_INSTITUTIONAL_GUIDE: 1,
  HISTORICAL_PRECEDENT: 2,
  PLANNING_SUGGESTION: 3,
  NEEDS_COUNSELOR_CONFIRMATION: 4,
};

function worseTier(left: VerificationTier | undefined, right: VerificationTier): VerificationTier {
  if (!left) return right;
  return TIER_RANK[left] >= TIER_RANK[right] ? left : right;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function planCourseCodeKey(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "-");
}

function completedCodes(history: AcademicHistoryCourse[], graph: ArticulationGraph): Set<string> {
  const codes = new Set<string>();
  for (const item of history) {
    if (!item.completed) continue;
    if (item.code) codes.add(item.code);
    if (item.courseId) {
      const course = graph.courseById.get(item.courseId);
      if (course) codes.add(course.code);
    }
  }
  return codes;
}

function rulesForTargets(graph: ArticulationGraph, targetIds: string[]): ArticulationRule[] {
  return targetIds.flatMap((id) => graph.rulesByTargetMajorId.get(id) ?? []);
}

function classifyBucket(primaryTargetId: string, targetIds: string[]): CourseBucket {
  const hitsPrimary = targetIds.includes(primaryTargetId);
  const secondaryHits = targetIds.filter((id) => id !== primaryTargetId).length;
  if (hitsPrimary && secondaryHits > 0) return "core_overlap";
  if (hitsPrimary) return "primary_mandate";
  return "secondary_divergence";
}

function courseWeight(isPrimary: boolean, secondaryCount: number, closesSeries: boolean): number {
  return (isPrimary ? 10 : 0) + secondaryCount * 2 + (closesSeries ? 3 : 0);
}

function buildCandidates(
  graph: ArticulationGraph,
  primaryTargetId: string,
  secondaryTargetIds: string[],
  completed: Set<string>,
): CandidateCourse[] {
  const byCode = new Map<string, CandidateCourse>();
  for (const rule of rulesForTargets(graph, [primaryTargetId, ...secondaryTargetIds])) {
    const evaluation = evaluateExpression(rule.expression, completed);
    if (evaluation.satisfied) continue;

    const sets = expandCandidateSets(rule.expression)
      .map((set) => set.filter((code) => code !== "NEEDS-COUNSELOR" && !completed.has(code)))
      .filter((set) => set.length > 0)
      .sort((left, right) => left.length - right.length);
    const chosen = sets[0] ?? [];

    for (const code of chosen) {
      const course = graph.courseByCode.get(code);
      if (!course) continue;
      const existing = byCode.get(code);
      const targetIds = existing ? unique([...existing.targetIds, rule.targetMajorId]) : [rule.targetMajorId];
      const isPrimary = targetIds.includes(primaryTargetId);
      const secondaryCount = targetIds.filter((id) => id !== primaryTargetId).length;
      byCode.set(code, {
        courseId: course.id,
        code: course.code,
        title: course.title,
        semesterUnits: course.semesterUnits,
        prerequisites: course.prerequisites,
        offeredTerms: course.offeredTerms,
        targetIds,
        verificationTier: worseTier(existing?.verificationTier, rule.verificationTier),
        evidenceNotes: unique([...(existing?.evidenceNotes ?? []), rule.notes || rule.label]),
        weight: courseWeight(isPrimary, secondaryCount, rule.expression.type === "SERIES_COMPLETE"),
        bucket: classifyBucket(primaryTargetId, targetIds),
        excessElectiveForTargets: existing?.excessElectiveForTargets ?? [],
      });
    }
  }

  for (const candidate of byCode.values()) {
    if (!candidate.targetIds.includes(primaryTargetId)) continue;
    for (const secondaryId of secondaryTargetIds) {
      if (candidate.targetIds.includes(secondaryId)) continue;
      const secondaryCodes = new Set(
        (graph.rulesByTargetMajorId.get(secondaryId) ?? []).flatMap((rule) => collectCourseCodes(rule.expression)),
      );
      const prereqCodes = candidate.prerequisites
        .map((id) => graph.courseById.get(id)?.code)
        .filter((code): code is string => Boolean(code));
      if (prereqCodes.some((code) => secondaryCodes.has(code))) {
        candidate.excessElectiveForTargets = unique([...candidate.excessElectiveForTargets, secondaryId]);
      }
    }
  }

  return [...byCode.values()];
}

function prereqClosure(courseId: string, graph: ArticulationGraph, completedIds: Set<string>, into: Set<string>) {
  if (completedIds.has(courseId) || into.has(courseId)) return;
  const course = graph.courseById.get(courseId);
  if (!course) return;
  for (const prereq of course.prerequisites) prereqClosure(prereq, graph, completedIds, into);
  into.add(courseId);
}

function toScheduledCourse(course: CandidateCourse): ScheduledCourse {
  return {
    courseId: course.courseId,
    code: course.code,
    title: course.title,
    semesterUnits: course.semesterUnits,
    bucket: course.bucket,
    fulfillsTargetIds: course.targetIds,
    verificationTier: course.verificationTier,
    evidenceNotes: course.evidenceNotes,
    excessElectiveForTargets: course.excessElectiveForTargets,
  };
}

function topoSchedule(
  candidates: CandidateCourse[],
  graph: ArticulationGraph,
  completedIds: Set<string>,
  maxUnitsPerTerm: number,
  includeSummer: boolean,
  startSeason: "fall" | "spring",
  startYear: number,
  unavailableNextTermCodes: Set<string>,
): ScheduleTerm[] {
  const needed = new Set<string>();
  for (const candidate of candidates) prereqClosure(candidate.courseId, graph, completedIds, needed);
  for (const id of completedIds) needed.delete(id);

  const candidateById = new Map(candidates.map((item) => [item.courseId, item]));
  for (const courseId of needed) {
    if (candidateById.has(courseId)) continue;
    const course = graph.courseById.get(courseId);
    if (!course) continue;
    candidateById.set(courseId, {
      courseId: course.id,
      code: course.code,
      title: course.title,
      semesterUnits: course.semesterUnits,
      prerequisites: course.prerequisites,
      offeredTerms: course.offeredTerms,
      targetIds: [],
      verificationTier: "PLANNING_SUGGESTION",
      evidenceNotes: ["Prerequisite supporting a required articulation course."],
      weight: 1,
      bucket: "primary_mandate",
      excessElectiveForTargets: [],
    });
  }

  const remaining = new Set(needed);
  const done = new Set(completedIds);
  const terms: ScheduleTerm[] = [];
  let season: "fall" | "spring" | "summer" = startSeason;
  let year = startYear;

  for (let guard = 0; remaining.size > 0 && guard < 24; guard += 1) {
    if (season === "summer" && !includeSummer) {
      season = "fall";
      continue;
    }

    const firstTerm = terms.length === 0;
    const blockedThisTerm = (course: CandidateCourse) =>
      firstTerm && unavailableNextTermCodes.has(planCourseCodeKey(course.code));

    const ready = [...remaining]
      .map((id) => candidateById.get(id)!)
      .filter((course) => course.prerequisites.every((prereq) => done.has(prereq)))
      .filter((course) => course.offeredTerms.includes(season))
      .sort((left, right) => right.weight - left.weight || left.code.localeCompare(right.code));
    const packable = ready.filter((course) => !blockedThisTerm(course));

    const selected: ScheduledCourse[] = [];
    let units = 0;
    const overflowTradeoffs: string[] = [];

    for (const course of packable) {
      if (units + course.semesterUnits > maxUnitsPerTerm) {
        if (course.bucket === "secondary_divergence") overflowTradeoffs.push(course.courseId);
        continue;
      }
      selected.push(toScheduledCourse(course));
      units += course.semesterUnits;
      remaining.delete(course.courseId);
      done.add(course.courseId);
    }

    if (selected.length === 0) {
      if (firstTerm) {
        // Leave the first term empty rather than forcing a blocked class or a later prereq.
      } else {
        const forced =
          ready[0] ??
          [...remaining]
            .map((id) => candidateById.get(id)!)
            .sort((left, right) => right.weight - left.weight)[0];
        if (!forced) break;
        selected.push(toScheduledCourse(forced));
        remaining.delete(forced.courseId);
        done.add(forced.courseId);
        units = forced.semesterUnits;
      }
    }

    terms.push({
      id: `${season}-${year}`,
      label: `${season[0]!.toUpperCase()}${season.slice(1)} ${year}`,
      season,
      year,
      totalSemesterUnits: units,
      courses: selected,
      conflicts: overflowTradeoffs.length
        ? [{
            kind: "unit_overflow",
            message: `Secondary divergence courses exceed the ${maxUnitsPerTerm}-unit cap this term.`,
            tradeoffCourseIds: overflowTradeoffs,
          }]
        : [],
    });

    if (season === "fall") season = "spring";
    else if (season === "spring") {
      season = includeSummer ? "summer" : "fall";
      if (!includeSummer) year += 1;
    } else {
      season = "fall";
      year += 1;
    }
  }

  return terms;
}

function buildAuditSummaries(
  graph: ArticulationGraph,
  targetIds: string[],
  completed: Set<string>,
  scheduledCodes: Set<string>,
): TargetAuditSummary[] {
  const available = new Set([...completed, ...scheduledCodes]);
  return targetIds.map((targetMajorId) => {
    const target = graph.targetMajorById.get(targetMajorId);
    const institution = target
      ? graph.institutions.find((item) => item.id === target.institutionId)
      : undefined;
    const unitSystem = institution?.unitSystem ?? "semester";
    const rules = graph.rulesByTargetMajorId.get(targetMajorId) ?? [];
    const requirementStates = rules.map((rule) => {
      const fromHistory = evaluateExpression(rule.expression, completed);
      const result = evaluateExpression(rule.expression, available);
      return {
        requirementKey: rule.requirementKey,
        label: rule.label,
        satisfied: result.satisfied,
        historySatisfied: fromHistory.satisfied,
        verificationTier: rule.verificationTier,
        missingCourseCodes: result.missingCourseCodes,
      };
    });
    const usedCodes = unique(
      rules
        .map((rule) => evaluateExpression(rule.expression, available))
        .filter((result) => result.satisfied)
        .flatMap((result) => result.usedCourseCodes),
    );
    const articulatedSemester = usedCodes
      .map((code) => graph.courseByCode.get(code)?.semesterUnits ?? 0)
      .reduce((sum, value) => sum + value, 0);
    const articulatedUnits = articulatedUnitsForAudit(articulatedSemester, unitSystem);
    const juniorStandingUnits = juniorStandingThreshold(unitSystem);
    return {
      targetMajorId,
      unitSystem,
      articulatedUnits,
      juniorStandingUnits,
      juniorStandingMet: articulatedUnits >= juniorStandingUnits,
      requirementStates,
    };
  });
}

function formatTargetList(graph: ArticulationGraph, ids: string[]): string {
  return ids.map((id) => formatGraphTargetLabel(graph, id)).join(", ");
}

function buildDivergencePoints(
  graph: ArticulationGraph,
  primaryTargetId: string,
  secondaryTargetIds: string[],
  candidates: CandidateCourse[],
): DivergencePoint[] {
  const points: DivergencePoint[] = [];
  for (const candidate of candidates) {
    if (candidate.bucket === "secondary_divergence") {
      const labels = formatTargetList(graph, candidate.targetIds);
      points.push({
        id: `div-secondary-${candidate.code}`,
        kind: "secondary_only",
        message: `${candidate.code} is required only for ${labels}, not your first-choice campus. Also plan classes that only the second school needs if you want it on the schedule.`,
        primaryCourseCodes: [],
        secondaryCourseCodes: [candidate.code],
        secondaryTargetIds: candidate.targetIds,
      });
    }
    if (candidate.excessElectiveForTargets.length) {
      const labels = formatTargetList(graph, candidate.excessElectiveForTargets);
      points.push({
        id: `div-excess-${candidate.code}`,
        kind: "superset_excess",
        message: `${candidate.code} is required for your first-choice campus and is not required for ${labels}.`,
        primaryCourseCodes: [candidate.code],
        secondaryCourseCodes: [],
        secondaryTargetIds: candidate.excessElectiveForTargets,
      });
    }
  }

  const primaryCalc = candidates.filter((item) => item.targetIds.includes(primaryTargetId) && item.code.startsWith("MATH-"));
  for (const secondaryId of secondaryTargetIds) {
    const secondaryCalc = candidates.filter((item) => item.targetIds.includes(secondaryId) && item.code.startsWith("MATH-"));
    const onlySecondary = secondaryCalc.filter((item) => !item.targetIds.includes(primaryTargetId));
    const onlyPrimary = primaryCalc.filter((item) => !item.targetIds.includes(secondaryId));
    if (
      onlySecondary.some((item) => item.code === "MATH-140") &&
      onlyPrimary.some((item) => item.code === "MATH-211" || item.code === "MATH-212")
    ) {
      points.push({
        id: `div-mutex-${secondaryId}`,
        kind: "mutually_exclusive",
        message: "Business calculus (MATH-140) vs analytic calculus (MATH-211+) conflict. Planner keeps the analytic sequence for primary overlap.",
        primaryCourseCodes: onlyPrimary.map((item) => item.code),
        secondaryCourseCodes: ["MATH-140"],
        secondaryTargetIds: [secondaryId],
      });
    }
  }
  return points;
}

export function computeMultiTargetPlan(input: MultiTargetPlanInput): MultiTargetPlanResult {
  const graph = input.graph ?? getSeedArticulationGraph();
  const secondaryTargetIds = (input.secondaryTargetIds ?? []).slice(0, 3);
  const includeSecondaryDivergence = input.includeSecondaryDivergence ?? true;
  const maxUnitsPerTerm = Math.max(6, Math.min(20, input.maxUnitsPerTerm ?? 15));
  const completed = completedCodes(input.history, graph);
  const completedIds = new Set(
    [...completed]
      .map((code) => graph.courseByCode.get(code)?.id)
      .filter((id): id is string => Boolean(id)),
  );

  if (!graph.targetMajorById.has(input.primaryTargetId)) {
    throw new Error(`Unknown primary target: ${input.primaryTargetId}`);
  }
  for (const id of secondaryTargetIds) {
    if (!graph.targetMajorById.has(id)) throw new Error(`Unknown secondary target: ${id}`);
  }

  let candidates = buildCandidates(graph, input.primaryTargetId, secondaryTargetIds, completed);
  if (!includeSecondaryDivergence) {
    candidates = candidates.filter((item) => item.bucket !== "secondary_divergence");
  }

  const unavailableNextTermCodes = new Set(
    (input.unavailableNextTermCodes ?? []).map(planCourseCodeKey).filter(Boolean),
  );
  const terms = topoSchedule(
    candidates,
    graph,
    completedIds,
    maxUnitsPerTerm,
    input.includeSummer ?? false,
    input.startSeason ?? "fall",
    input.startYear ?? 2026,
    unavailableNextTermCodes,
  );

  const schedule: PlanSchedule = {
    unitSystem: "semester",
    maxUnitsPerTerm,
    terms,
    includeSecondaryDivergence,
  };

  const scheduledCodes = new Set(terms.flatMap((term) => term.courses.map((course) => course.code)));
  const auditSummary = buildAuditSummaries(
    graph,
    [input.primaryTargetId, ...secondaryTargetIds],
    completed,
    scheduledCodes,
  );
  const divergencePoints = buildDivergencePoints(graph, input.primaryTargetId, secondaryTargetIds, candidates);
  const usedRules = rulesForTargets(graph, [input.primaryTargetId, ...secondaryTargetIds]);

  return {
    primaryTargetId: input.primaryTargetId,
    secondaryTargetIds,
    schedule,
    auditSummary,
    divergencePoints,
    evidenceGraphSnapshot: {
      releaseId: graph.releaseId,
      evaluatedAt: new Date().toISOString(),
      ruleIds: usedRules.map((rule) => rule.id),
      verificationTiers: unique(usedRules.map((rule) => rule.verificationTier)) as VerificationTier[],
    },
    totalSemesterUnits: terms.reduce((sum, term) => sum + term.totalSemesterUnits, 0),
    algorithmVersion: MULTI_TARGET_ALGORITHM_VERSION,
  };
}
