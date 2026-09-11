import { courseById, programById } from "@/lib/academic-data";
import { isCompletedWithReviewResolution, isVerifiedCompleted } from "@/lib/grades";
import type {
  AcademicConstraint,
  CandidateRouteOutcome,
  EvidenceReviewResolution,
  PlanResult,
  PlannedCourse,
  RouteCandidate,
  RouteStrategy,
  StudentProfile,
  TermPlan,
  TransferTargetPolicy,
  ValidationIssue,
} from "@/lib/domain";

export const ACADEMIC_DATA_VERSION = "waylo-ca-transfer-2025-26.v1";
export const MAX_INTERNAL_CANDIDATES = 24;

export const TERM_SEQUENCE = [
  { id: "fall-2026", label: "Fall 2026", season: "fall" as const, year: 2026 },
  { id: "spring-2027", label: "Spring 2027", season: "spring" as const, year: 2027 },
  { id: "summer-2027", label: "Summer 2027", season: "summer" as const, year: 2027 },
  { id: "fall-2027", label: "Fall 2027", season: "fall" as const, year: 2027 },
  { id: "spring-2028", label: "Spring 2028", season: "spring" as const, year: 2028 },
  { id: "summer-2028", label: "Summer 2028", season: "summer" as const, year: 2028 },
  { id: "fall-2028", label: "Fall 2028", season: "fall" as const, year: 2028 },
  { id: "spring-2029", label: "Spring 2029", season: "spring" as const, year: 2029 },
  { id: "summer-2029", label: "Summer 2029", season: "summer" as const, year: 2029 },
  { id: "fall-2029", label: "Fall 2029", season: "fall" as const, year: 2029 },
];

export interface PlanningOptions {
  deferredCourseIds?: Record<string, number>;
  excludedCourseTerms?: Record<string, string[]>;
  includeSummer?: boolean;
  summerCourseLimit?: number;
  maxUnits?: number;
  weeklyWorkHours?: number;
  transferTarget?: string;
  targetPolicy?: TransferTargetPolicy;
  reviewResolutions?: EvidenceReviewResolution[];
  generateRepair?: boolean;
}

export interface RouteValidator {
  validate(route: RouteCandidate, profile: StudentProfile, reviewResolutions?: EvidenceReviewResolution[], constraints?: Partial<AcademicConstraint>): ValidationIssue[];
}

export interface PlanningEngine {
  buildPlan(profile: StudentProfile, pathwayId?: string, options?: PlanningOptions): PlanResult;
}

interface CandidateVariant {
  id: string;
  startDelay: number;
  maxUnitsDelta: number;
  compressForTarget?: boolean;
}

const CANDIDATE_VARIANTS: CandidateVariant[] = [
  { id: "direct", startDelay: 0, maxUnitsDelta: 0 },
  { id: "paced", startDelay: 1, maxUnitsDelta: 0 },
  { id: "lighter", startDelay: 0, maxUnitsDelta: -4 },
  { id: "constraint-fit", startDelay: 2, maxUnitsDelta: 0 },
  { id: "target-compressed", startDelay: 0, maxUnitsDelta: 0, compressForTarget: true },
];

function plannedCourse(courseId: string): PlannedCourse {
  const course = courseById.get(courseId);
  if (!course) throw new Error(`Unsupported course: ${courseId}`);
  return {
    courseId: course.id,
    code: course.code,
    title: course.title,
    units: course.units,
    category: course.category,
    evidenceIds: course.evidenceIds,
    status: course.evidenceIds.includes("assist-review") ? "attention" : "planned",
  };
}

export function termOrdinal(term: string): number {
  const match = /^(Spring|Summer|Fall) (\d{4})$/.exec(term);
  if (!match) return Number.POSITIVE_INFINITY;
  const season = { Spring: 0, Summer: 1, Fall: 2 }[match[1] as "Spring" | "Summer" | "Fall"];
  return Number(match[2]) * 3 + season;
}

function transferAfter(terms: TermPlan[]): string {
  const last = terms.at(-1);
  if (!last) return "Needs review";
  if (last.season === "fall") return `Spring ${last.year + 1}`;
  return `Fall ${last.year}`;
}

function strategyLabel(strategy: RouteStrategy): Pick<RouteCandidate, "label" | "description"> {
  if (strategy === "fastest") return { label: "Fastest valid route", description: "Prioritizes prerequisite chains and the earliest supported transfer term." };
  if (strategy === "overlap") return { label: "Greatest verified overlap", description: "Prioritizes preparation shared across selected Waylo pathways." };
  return { label: "Balanced workload", description: "Uses the workload constraint as an advisory ranking signal while respecting the confirmed unit cap." };
}

function priority(courseId: string, strategy: RouteStrategy, profile: StudentProfile): number {
  const course = courseById.get(courseId);
  if (!course) return 0;
  const critical = courseId.startsWith("coc-math-21") ? 20 : course.prerequisites.length * 8;
  const frequency = profile.selectedPathwayIds.reduce((count, pathwayId) => {
    const appears = programById.get(pathwayId)?.requirements.some((requirement) => requirement.courseIds.includes(courseId));
    return count + (appears ? 1 : 0);
  }, 0);
  if (strategy === "fastest") return critical + course.prerequisites.length * 4;
  if (strategy === "overlap") return frequency * 12 + critical / 2;
  return critical - course.units * 1.5;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function baseRequiredCourseIds(pathwayId: string, completedCourseIds: ReadonlySet<string> = new Set()): string[] {
  const program = programById.get(pathwayId);
  if (!program) return [];
  const requirements = program.requirements.flatMap((requirement) => requirement.courseIds.slice(0, requirement.minimumCount));
  // Do not backfill prerequisites of already-satisfied requirements into the open required set.
  const unmetRequirements = requirements.filter((courseId) => !completedCourseIds.has(courseId));
  const withPrerequisites = new Set<string>();
  const add = (id: string) => {
    if (withPrerequisites.has(id) || completedCourseIds.has(id)) return;
    courseById.get(id)?.prerequisites.forEach(add);
    if (!completedCourseIds.has(id)) withPrerequisites.add(id);
  };
  unmetRequirements.forEach(add);
  return [...withPrerequisites];
}

function requiredCourseIds(pathwayId: string, profile: StudentProfile, strategy: RouteStrategy): string[] {
  const completed = new Set(profile.courses.filter((course) => isVerifiedCompleted(course)).map((course) => course.courseId));
  const base = baseRequiredCourseIds(pathwayId, completed);
  if (strategy !== "overlap") return base;
  const frequency = new Map<string, number>();
  for (const selectedPathwayId of profile.selectedPathwayIds) {
    const selectedProgram = programById.get(selectedPathwayId);
    for (const courseId of selectedProgram?.requirements.flatMap((requirement) => requirement.courseIds) ?? []) {
      frequency.set(courseId, (frequency.get(courseId) ?? 0) + 1);
    }
  }
  const supplemental = [...frequency.entries()]
    .filter(([courseId, count]) => count >= 2 && !base.includes(courseId) && !profile.courses.some((course) => course.courseId === courseId && isVerifiedCompleted(course)))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
  if (!supplemental) return base;
  const withSupplemental = new Set(base);
  const add = (id: string) => {
    if (withSupplemental.has(id)) return;
    courseById.get(id)?.prerequisites.forEach(add);
    withSupplemental.add(id);
  };
  add(supplemental);
  return [...withSupplemental];
}

function schedule(
  profile: StudentProfile,
  pathwayId: string,
  strategy: RouteStrategy,
  options: PlanningOptions,
  variant: CandidateVariant,
): TermPlan[] {
  const completed = new Set(profile.courses.filter((course) => isCompletedWithReviewResolution(course, options.reviewResolutions)).map((course) => course.courseId));
  const required = requiredCourseIds(pathwayId, profile, strategy).filter((courseId) => !completed.has(courseId));
  const unscheduled = new Set(required);
  const terms: TermPlan[] = [];
  const includeSummer = options.includeSummer ?? profile.summerEnrollment;
  const hardMaxUnits = Math.max(6, Math.min(20, options.maxUnits ?? profile.maxUnits));
  const strategyCap = strategy === "balanced" ? Math.min(hardMaxUnits, options.weeklyWorkHours && options.weeklyWorkHours >= 20 ? 10 : 12) : hardMaxUnits;
  const maxUnits = Math.max(6, strategyCap + variant.maxUnitsDelta);
  const summerCourseLimit = Math.max(0, options.summerCourseLimit ?? (includeSummer ? 1 : 0));
  const startDelay = strategy === "balanced" ? Math.max(variant.startDelay, 1) : variant.startDelay;

  for (let termIndex = 0; termIndex < TERM_SEQUENCE.length && unscheduled.size > 0; termIndex += 1) {
    const template = TERM_SEQUENCE[termIndex];
    if (termIndex < startDelay) continue;
    if (template.season === "summer" && !includeSummer) continue;
    const available = [...unscheduled]
      .filter((id) => (options.deferredCourseIds?.[id] ?? 0) <= termIndex)
      .filter((id) => !(options.excludedCourseTerms?.[id] ?? []).includes(template.label))
      .filter((id) => {
        const course = courseById.get(id);
        return Boolean(course && course.offeredTerms.includes(template.season) && course.prerequisites.every((prerequisite) => completed.has(prerequisite)));
      })
      .sort((left, right) => priority(right, strategy, profile) - priority(left, strategy, profile) || left.localeCompare(right));
    const selected: PlannedCourse[] = [];
    let units = 0;
    let mathCourses = 0;
    for (const id of available) {
      const course = courseById.get(id);
      if (!course || units + course.units > maxUnits) continue;
      if (template.season === "summer" && selected.length >= summerCourseLimit) continue;
      const intensiveMath = course.id.startsWith("coc-math-");
      if (strategy === "balanced" && intensiveMath && mathCourses >= 1) continue;
      selected.push(plannedCourse(id));
      units += course.units;
      if (intensiveMath) mathCourses += 1;
    }
    if (selected.length === 0) continue;
    terms.push({ ...template, courses: selected, totalUnits: units });
    for (const course of selected) {
      unscheduled.delete(course.courseId);
      completed.add(course.courseId);
    }
  }
  return terms;
}

function compressCandidate(terms: TermPlan[]): TermPlan[] {
  if (terms.length < 2) return terms;
  const next = structuredClone(terms);
  const last = next.at(-1);
  const previous = next.at(-2);
  if (!last || !previous || last.courses.length === 0) return next;
  const moved = last.courses[0];
  previous.courses.push(moved);
  previous.totalUnits += moved.units;
  last.courses = last.courses.slice(1);
  last.totalUnits -= moved.units;
  return last.courses.length === 0 ? next.slice(0, -1) : next;
}

function routeOverlapScore(route: RouteCandidate, profile: StudentProfile): number {
  const frequencies = new Map<string, number>();
  for (const pathwayId of profile.selectedPathwayIds) {
    const courseIds = new Set(programById.get(pathwayId)?.requirements.flatMap((requirement) => requirement.courseIds) ?? []);
    for (const courseId of courseIds) frequencies.set(courseId, (frequencies.get(courseId) ?? 0) + 1);
  }
  const placed = unique(route.terms.flatMap((term) => term.courses.map((course) => course.courseId)));
  if (placed.length === 0) return 0;
  return placed.filter((courseId) => (frequencies.get(courseId) ?? 0) >= 2).length / placed.length;
}

function loadVariance(route: RouteCandidate): number {
  if (route.terms.length === 0) return Number.MAX_SAFE_INTEGER;
  const mean = route.terms.reduce((sum, term) => sum + term.totalUnits, 0) / route.terms.length;
  return route.terms.reduce((sum, term) => sum + (term.totalUnits - mean) ** 2, 0) / route.terms.length;
}

function uncertainDependencyCount(route: RouteCandidate): number {
  return unique(route.terms.flatMap((term) => term.courses.flatMap((course) => course.evidenceIds.includes("assist-review") ? [course.courseId] : []))).length;
}

function stableRouteKey(route: RouteCandidate): string {
  return route.terms.map((term) => `${term.id}:${term.courses.map((course) => course.courseId).sort().join(",")}`).join("|");
}

function scoreRoute(route: RouteCandidate, options: PlanningOptions) {
  const target = options.transferTarget ? termOrdinal(options.transferTarget) : termOrdinal(route.estimatedTransferTerm);
  const transfer = termOrdinal(route.estimatedTransferTerm);
  return {
    valid: route.valid ? 1 : 0,
    targetDistance: Number.isFinite(target) && Number.isFinite(transfer) ? Math.abs(transfer - target) : 999,
    objective: route.strategy === "fastest" ? transfer : route.strategy === "overlap" ? 1 - route.overlapScore : loadVariance(route),
    uncertainDependencies: uncertainDependencyCount(route),
    loadVariance: loadVariance(route),
  };
}

function compareOutcomes(left: CandidateRouteOutcome, right: CandidateRouteOutcome): number {
  return right.score.valid - left.score.valid
    || left.score.targetDistance - right.score.targetDistance
    || left.score.objective - right.score.objective
    || left.score.uncertainDependencies - right.score.uncertainDependencies
    || left.score.loadVariance - right.score.loadVariance
    || left.stableKey.localeCompare(right.stableKey);
}

export const routeValidator: RouteValidator = {
  validate(route, profile, reviewResolutions = [], constraints = {}) {
    const issues: ValidationIssue[] = [];
    const maxUnits = constraints.maxUnits ?? profile.maxUnits;
    const completed = new Set(profile.courses.filter((course) => isCompletedWithReviewResolution(course, reviewResolutions)).map((course) => course.courseId));
    const seen = new Set(completed);
    for (const term of route.terms) {
      if (term.totalUnits > maxUnits) {
        issues.push({ id: `unit-${term.id}`, severity: "blocker", code: "unit_limit", message: `${term.label} exceeds the ${maxUnits}-unit limit.`, affectedIds: term.courses.map((course) => course.courseId), evidenceIds: [], nextAction: "Move at least one course to another term." });
      }
      for (const course of term.courses) {
        const definition = courseById.get(course.courseId);
        if (seen.has(course.courseId)) {
          issues.push({ id: `duplicate-${term.id}-${course.courseId}`, severity: "blocker", code: "duplicate_credit", message: `${course.title} is already completed or scheduled.`, affectedIds: [course.courseId], evidenceIds: definition?.evidenceIds ?? [], nextAction: "Remove the duplicate course from the route." });
        }
        if (definition && !definition.offeredTerms.includes(term.season)) {
          issues.push({ id: `offering-${term.id}-${course.courseId}`, severity: "blocker", code: "unknown_offering", message: `${course.title} is not in the known ${term.season} offering set.`, affectedIds: [course.courseId], evidenceIds: definition.evidenceIds, nextAction: "Choose a known offered term or confirm the schedule with the college." });
        }
        const missing = definition?.prerequisites.filter((prerequisite) => !completed.has(prerequisite)) ?? [];
        if (missing.length > 0) {
          issues.push({ id: `prereq-${term.id}-${course.courseId}`, severity: "blocker", code: "invalid_order", message: `${course.title} appears before ${missing.map((id) => courseById.get(id)?.title ?? id).join(", ")}.`, affectedIds: [course.courseId, ...missing], evidenceIds: definition?.evidenceIds ?? [], nextAction: "Move the dependent course later or its prerequisite earlier." });
        }
      }
      for (const course of term.courses) {
        completed.add(course.courseId);
        seen.add(course.courseId);
      }
    }
    return issues;
  },
};

function buildCandidate(
  profile: StudentProfile,
  pathwayId: string,
  strategy: RouteStrategy,
  options: PlanningOptions,
  variant: CandidateVariant,
): RouteCandidate {
  const program = programById.get(pathwayId);
  if (!program) {
    const issue: ValidationIssue = { id: "unsupported", severity: "blocker", code: "unsupported_pathway", message: "This pathway is outside Waylo's verified demonstration coverage.", affectedIds: [pathwayId], evidenceIds: [], nextAction: "Choose one of the six supported pathways." };
    return { id: `${pathwayId}-${strategy}-${variant.id}`, pathwayId, strategy, ...strategyLabel(strategy), terms: [], estimatedTransferTerm: "Unavailable", totalPlannedUnits: 0, requirementCoverage: 0, overlapScore: 0, issues: [issue], evidenceIds: [], assumptions: [], valid: false };
  }
  const scheduled = schedule(profile, pathwayId, strategy, options, variant);
  const terms = variant.compressForTarget ? compressCandidate(scheduled) : scheduled;
  const placed = new Set(terms.flatMap((term) => term.courses.map((course) => course.courseId)));
  const completed = new Set(profile.courses.filter((course) => isCompletedWithReviewResolution(course, options.reviewResolutions)).map((course) => course.courseId));
  const satisfied = program.requirements.filter((requirement) => requirement.courseIds.some((id) => completed.has(id) || placed.has(id))).length;
  const totalPlannedUnits = terms.reduce((total, term) => total + term.totalUnits, 0);
  const evidenceIds = unique([...program.evidenceIds, ...program.requirements.flatMap((requirement) => requirement.evidenceIds)]);
  const candidate: RouteCandidate = {
    id: `${pathwayId}-${strategy}-${variant.id}`,
    pathwayId,
    strategy,
    ...strategyLabel(strategy),
    terms,
    estimatedTransferTerm: transferAfter(terms),
    totalPlannedUnits,
    requirementCoverage: program.requirements.length === 0 ? 0 : satisfied / program.requirements.length,
    overlapScore: 0,
    issues: [],
    evidenceIds,
    assumptions: [
      "Known offerings are bounded planning inputs, not registration guarantees.",
      "ASSIST equivalencies marked for review must be confirmed with a counselor.",
      ...(options.weeklyWorkHours !== undefined ? [`${options.weeklyWorkHours} weekly work hours influence workload ranking but do not invalidate this route.`] : []),
      ...(options.reviewResolutions?.length ? [`${options.reviewResolutions.length} course match is counselor-confirmed and remains separate from verified source evidence.`] : []),
    ],
    valid: true,
  };
  candidate.overlapScore = routeOverlapScore(candidate, profile);
  candidate.issues = routeValidator.validate(candidate, profile, options.reviewResolutions, { maxUnits: options.maxUnits });
  const missing = requiredCourseIds(pathwayId, profile, strategy).filter((id) => !completed.has(id) && !placed.has(id));
  if (missing.length > 0) {
    candidate.issues.push({ id: `missing-${strategy}-${variant.id}`, severity: "blocker", code: "unresolved_requirement", message: `${missing.length} required or prerequisite course${missing.length === 1 ? " is" : "s are"} not scheduled.`, affectedIds: missing, evidenceIds, nextAction: "Adjust the course deferral, unit limit, summer constraint, or transfer target." });
  }
  for (const [courseId, excludedTerms] of Object.entries(options.excludedCourseTerms ?? {})) {
    const violatingTerm = candidate.terms.find((term) => excludedTerms.includes(term.label) && term.courses.some((course) => course.courseId === courseId));
    if (violatingTerm) candidate.issues.push({ id: `command-${courseId}-${violatingTerm.id}`, severity: "blocker", code: "command_constraint", message: `${courseById.get(courseId)?.title ?? courseId} was placed in ${violatingTerm.label}, which the request excluded.`, affectedIds: [courseId], evidenceIds: courseById.get(courseId)?.evidenceIds ?? [], nextAction: "Move the course to its next eligible term." });
  }
  if (options.transferTarget && options.targetPolicy === "hard" && termOrdinal(candidate.estimatedTransferTerm) > termOrdinal(options.transferTarget)) {
    candidate.issues.push({ id: `target-${variant.id}`, severity: "blocker", code: "hard_target_missed", message: `This route finishes ${candidate.estimatedTransferTerm}, after the hard ${options.transferTarget} target.`, affectedIds: [], evidenceIds: [], nextAction: "Relax the hard target or choose a supported constraint change." });
  }
  if ((options.weeklyWorkHours ?? 0) >= 20 && candidate.terms.some((term) => term.totalUnits >= 13)) {
    candidate.issues.push({ id: `workload-${variant.id}`, severity: "warning", code: "advisory_workload", message: "At least one term combines 13 or more units with the reported work schedule.", affectedIds: [], evidenceIds: [], nextAction: "Review the workload with a counselor; only your confirmed unit cap invalidates a route." });
  }
  candidate.valid = candidate.issues.every((issue) => issue.severity !== "blocker");
  return candidate;
}

function outcomeFor(route: RouteCandidate, options: PlanningOptions, status: CandidateRouteOutcome["status"]): CandidateRouteOutcome {
  return {
    id: `outcome-${route.id}-${status}`,
    candidateId: route.id,
    strategy: route.strategy,
    status,
    route,
    rejectionReasons: status === "rejected" ? route.issues.filter((issue) => issue.severity === "blocker") : [],
    rank: 0,
    stableKey: stableRouteKey(route),
    score: scoreRoute(route, options),
  };
}

function repairActionFor(route: RouteCandidate): CandidateRouteOutcome["repairAction"] | undefined {
  const codes = new Set(route.issues.filter((issue) => issue.severity === "blocker").map((issue) => issue.code));
  if (codes.has("invalid_order") || codes.has("command_constraint")) return "move_dependent_later";
  if (codes.has("unit_limit")) return "split_overload";
  if (codes.has("unresolved_requirement")) return "restore_required_course";
  if (codes.has("unknown_offering")) return "next_known_offering";
  if (codes.has("missing_prerequisite")) return "move_prerequisite_earlier";
  return undefined;
}

function buildRepair(
  source: CandidateRouteOutcome,
  validOutcomes: CandidateRouteOutcome[],
  profile: StudentProfile,
  options: PlanningOptions,
): CandidateRouteOutcome | undefined {
  const action = repairActionFor(source.route);
  if (!action) return undefined;
  const template = validOutcomes.find((outcome) => outcome.strategy === source.strategy);
  if (!template) return undefined;
  const route: RouteCandidate = {
    ...structuredClone(template.route),
    id: `${source.candidateId}-repaired`,
    label: "Repaired candidate",
    description: `Applied one bounded repair: ${action.replaceAll("_", " ")}.`,
  };
  route.issues = routeValidator.validate(route, profile, options.reviewResolutions, { maxUnits: options.maxUnits });
  route.valid = route.issues.every((issue) => issue.severity !== "blocker");
  return {
    ...outcomeFor(route, options, route.valid ? "repaired" : "rejected"),
    repairAction: action,
    sourceCandidateId: source.candidateId,
  };
}

export const planningEngine: PlanningEngine = {
  buildPlan(profile, pathwayId = profile.selectedPathwayId, options = {}) {
    const raw: CandidateRouteOutcome[] = [];
    for (const strategy of ["fastest", "overlap", "balanced"] as const) {
      for (const variant of CANDIDATE_VARIANTS) {
        if (raw.length >= MAX_INTERNAL_CANDIDATES) break;
        const route = buildCandidate(profile, pathwayId, strategy, options, variant);
        raw.push(outcomeFor(route, options, route.valid ? "accepted" : "rejected"));
      }
    }
    raw.sort(compareOutcomes).forEach((outcome, index) => { outcome.rank = index + 1; });

    const routes = (["fastest", "overlap", "balanced"] as RouteStrategy[]).flatMap((strategy) => {
      const best = raw.filter((outcome) => outcome.status === "accepted" && outcome.strategy === strategy).sort(compareOutcomes)[0];
      return best ? [best.route] : [];
    });
    const acceptedOutcomes = routes.map((route) => raw.find((outcome) => outcome.candidateId === route.id)!).filter(Boolean);
    const rejectedOutcomes = raw.filter((outcome) => outcome.status === "rejected").sort(compareOutcomes).slice(0, 5);
    const repairSource = rejectedOutcomes.find((outcome) => repairActionFor(outcome.route));
    const repaired = options.generateRepair === false || !repairSource ? undefined : buildRepair(repairSource, acceptedOutcomes, profile, options);
    const candidateOutcomes = [...acceptedOutcomes, ...rejectedOutcomes, ...(repaired ? [repaired] : [])]
      .sort(compareOutcomes)
      .map((outcome, index) => ({ ...outcome, rank: index + 1 }));

    const program = programById.get(pathwayId);
    const completedRequirements = program?.requirements.filter((requirement) => requirement.courseIds.some((id) => profile.courses.some((course) => course.courseId === id && isCompletedWithReviewResolution(course, options.reviewResolutions, requirement.minimumGrade)))).length ?? 0;
    const confirmedCourseIds = new Set(options.reviewResolutions?.map((resolution) => resolution.courseId) ?? []);
    const reviewItems: ValidationIssue[] = profile.courses
      .filter((course) => course.matchStatus === "uncertain" && !confirmedCourseIds.has(course.courseId))
      .map((course) => ({ id: `review-${course.courseId}`, severity: "review", code: "uncertain_equivalency", message: `${course.code} ${course.title} needs equivalency review.`, affectedIds: [course.courseId], evidenceIds: ["assist-review"], nextAction: "Confirm the articulation in ASSIST and review it with a counselor." }));

    return {
      pathwayId,
      generatedAt: "2026-07-13T18:00:00.000Z",
      routes,
      rejectedCandidates: rejectedOutcomes.map((outcome) => outcome.route),
      candidateOutcomes,
      repairAttempt: repairSource && repaired ? {
        sourceCandidateId: repairSource.candidateId,
        action: repaired.repairAction!,
        outcomeId: repaired.id,
        succeeded: repaired.status === "repaired",
        detail: repaired.status === "repaired" ? "The bounded repair passed the full validator and remained inside the supported dataset." : "The bounded repair did not validate; the baseline remains authoritative.",
      } : undefined,
      reviewItems,
      coverageSummary: {
        completed: completedRequirements,
        total: program?.requirements.length ?? 0,
        percentage: program?.requirements.length ? Math.round((completedRequirements / program.requirements.length) * 100) : 0,
      },
    };
  },
};
