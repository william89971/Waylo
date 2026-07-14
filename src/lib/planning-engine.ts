import { courseById, programById } from "@/lib/academic-data";
import { isCompletedWithReviewResolution, isVerifiedCompleted } from "@/lib/grades";
import type { EvidenceReviewResolution, PlanResult, PlannedCourse, RouteCandidate, RouteStrategy, StudentProfile, TermPlan, ValidationIssue } from "@/lib/domain";

export const TERM_SEQUENCE = [
  { id: "fall-2026", label: "Fall 2026", season: "fall" as const, year: 2026 },
  { id: "spring-2027", label: "Spring 2027", season: "spring" as const, year: 2027 },
  { id: "summer-2027", label: "Summer 2027", season: "summer" as const, year: 2027 },
  { id: "fall-2027", label: "Fall 2027", season: "fall" as const, year: 2027 },
  { id: "spring-2028", label: "Spring 2028", season: "spring" as const, year: 2028 },
  { id: "fall-2028", label: "Fall 2028", season: "fall" as const, year: 2028 },
  { id: "spring-2029", label: "Spring 2029", season: "spring" as const, year: 2029 },
];

export interface PlanningOptions {
  deferredCourseIds?: Record<string, number>;
  includeSummer?: boolean;
  reviewResolutions?: EvidenceReviewResolution[];
}

export interface RouteValidator {
  validate(route: RouteCandidate, profile: StudentProfile, reviewResolutions?: EvidenceReviewResolution[]): ValidationIssue[];
}

export interface PlanningEngine {
  buildPlan(profile: StudentProfile, pathwayId?: string, options?: PlanningOptions): PlanResult;
}

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

function transferAfter(terms: TermPlan[]): string {
  const last = terms.at(-1);
  if (!last) return "Needs review";
  if (last.season === "fall") return `Spring ${last.year + 1}`;
  if (last.season === "spring") return `Fall ${last.year}`;
  return `Fall ${last.year}`;
}

function strategyLabel(strategy: RouteStrategy): Pick<RouteCandidate, "label" | "description"> {
  if (strategy === "fastest") return { label: "Fastest valid route", description: "Prioritizes prerequisite chains and the earliest supported transfer term." };
  if (strategy === "overlap") return { label: "Greatest overlap", description: "Prioritizes preparation shared across the selected Waylo pathways." };
  return { label: "Balanced workload", description: "Starts the intensive sequence one term later and limits each term to one math course for a steadier pace." };
}

function priority(courseId: string, strategy: RouteStrategy): number {
  const course = courseById.get(courseId);
  if (!course) return 0;
  const critical = courseId.startsWith("coc-math-21") ? 20 : course.prerequisites.length * 8;
  const overlap = ["coc-math-211", "coc-stat-c1000", "coc-compsci-111", "coc-compsci-182"].includes(courseId) ? 15 : 0;
  const loadPenalty = strategy === "balanced" ? course.units : 0;
  return strategy === "fastest" ? critical : strategy === "overlap" ? overlap + critical / 2 : critical - loadPenalty;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function baseRequiredCourseIds(pathwayId: string): string[] {
  const program = programById.get(pathwayId);
  if (!program) return [];
  const requirements = program.requirements.flatMap((requirement) => requirement.courseIds.slice(0, requirement.minimumCount));
  const withPrerequisites = new Set<string>();
  const add = (id: string) => {
    if (withPrerequisites.has(id)) return;
    courseById.get(id)?.prerequisites.forEach(add);
    withPrerequisites.add(id);
  };
  requirements.forEach(add);
  return [...withPrerequisites];
}

function requiredCourseIds(pathwayId: string, profile?: StudentProfile, strategy?: RouteStrategy): string[] {
  const base = baseRequiredCourseIds(pathwayId);
  if (strategy !== "overlap" || !profile) return base;
  const frequency = new Map<string, number>();
  for (const selectedPathwayId of profile.selectedPathwayIds) {
    const selectedProgram = programById.get(selectedPathwayId);
    for (const courseId of selectedProgram?.requirements.flatMap((requirement) => requirement.courseIds) ?? []) {
      frequency.set(courseId, (frequency.get(courseId) ?? 0) + 1);
    }
  }
  const supplemental = [...frequency.entries()]
    .filter(([courseId, count]) => count >= 1 && !base.includes(courseId) && !profile.courses.some((course) => course.courseId === courseId && isVerifiedCompleted(course)))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
  if (!supplemental) return base;
  const withSupplemental = new Set(base);
  const add = (id: string) => { if (withSupplemental.has(id)) return; courseById.get(id)?.prerequisites.forEach(add); withSupplemental.add(id); };
  add(supplemental);
  return [...withSupplemental];
}

function schedule(profile: StudentProfile, pathwayId: string, strategy: RouteStrategy, options: PlanningOptions): TermPlan[] {
  const completed = new Set(profile.courses.filter((course) => isCompletedWithReviewResolution(course, options.reviewResolutions)).map((course) => course.courseId));
  const required = requiredCourseIds(pathwayId, profile, strategy).filter((courseId) => !completed.has(courseId));
  const unscheduled = new Set(required);
  const terms: TermPlan[] = [];
  const includeSummer = options.includeSummer ?? profile.summerEnrollment;
  const maxUnits = strategy === "balanced" ? Math.min(profile.maxUnits, 12) : profile.maxUnits;

  for (let termIndex = 0; termIndex < TERM_SEQUENCE.length && unscheduled.size > 0; termIndex += 1) {
    const template = TERM_SEQUENCE[termIndex];
    if (template.season === "summer" && !includeSummer) continue;
    if (strategy === "balanced" && termIndex === 0) continue;
    const available = [...unscheduled]
      .filter((id) => (options.deferredCourseIds?.[id] ?? 0) <= termIndex)
      .filter((id) => {
        const course = courseById.get(id);
        return Boolean(course && course.offeredTerms.includes(template.season) && course.prerequisites.every((prereq) => completed.has(prereq)));
      })
      .sort((a, b) => priority(b, strategy) - priority(a, strategy));
    const selected: PlannedCourse[] = [];
    let units = 0;
    let mathCourses = 0;
    for (const id of available) {
      const course = courseById.get(id);
      if (!course || units + course.units > maxUnits) continue;
      const isIntensiveMath = course.id.startsWith("coc-math-");
      if (strategy === "balanced" && isIntensiveMath && mathCourses >= 1) continue;
      selected.push(plannedCourse(id));
      units += course.units;
      if (isIntensiveMath) mathCourses += 1;
    }
    if (selected.length === 0) continue;
    terms.push({ ...template, courses: selected, totalUnits: units });
    selected.forEach((course) => {
      unscheduled.delete(course.courseId);
      completed.add(course.courseId);
    });
  }
  return terms;
}

export const routeValidator: RouteValidator = {
  validate(route, profile, reviewResolutions = []) {
    const issues: ValidationIssue[] = [];
    const completed = new Set(profile.courses.filter((course) => isCompletedWithReviewResolution(course, reviewResolutions)).map((course) => course.courseId));
    const seen = new Set(completed);
    for (const term of route.terms) {
      if (term.totalUnits > profile.maxUnits) {
        issues.push({ id: `unit-${term.id}`, severity: "blocker", code: "unit_limit", message: `${term.label} exceeds the ${profile.maxUnits}-unit limit.`, affectedIds: term.courses.map((course) => course.courseId), evidenceIds: [], nextAction: "Move at least one course to another term." });
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
          issues.push({ id: `prereq-${term.id}-${course.courseId}`, severity: "blocker", code: "invalid_order", message: `${course.title} appears before ${missing.map((id) => courseById.get(id)?.title ?? id).join(", ")}.`, affectedIds: [course.courseId, ...missing], evidenceIds: definition?.evidenceIds ?? [], nextAction: "Move the prerequisite into an earlier term." });
        }
      }
      term.courses.forEach((course) => { completed.add(course.courseId); seen.add(course.courseId); });
    }
    return issues;
  },
};

function buildCandidate(profile: StudentProfile, pathwayId: string, strategy: RouteStrategy, options: PlanningOptions): RouteCandidate {
  const program = programById.get(pathwayId);
  if (!program) {
    const issue: ValidationIssue = { id: "unsupported", severity: "blocker", code: "unsupported_pathway", message: "This pathway is outside Waylo's verified demonstration coverage.", affectedIds: [pathwayId], evidenceIds: [], nextAction: "Choose one of the six supported pathways." };
    return { id: `${pathwayId}-${strategy}`, pathwayId, strategy, ...strategyLabel(strategy), terms: [], estimatedTransferTerm: "Unavailable", totalPlannedUnits: 0, requirementCoverage: 0, overlapScore: 0, issues: [issue], evidenceIds: [], assumptions: [], valid: false };
  }
  const terms = schedule(profile, pathwayId, strategy, options);
  const placed = new Set(terms.flatMap((term) => term.courses.map((course) => course.courseId)));
  const completed = new Set(profile.courses.filter((course) => isCompletedWithReviewResolution(course, options.reviewResolutions)).map((course) => course.courseId));
  const satisfied = program.requirements.filter((requirement) => requirement.courseIds.some((id) => completed.has(id) || placed.has(id))).length;
  const totalPlannedUnits = terms.reduce((total, term) => total + term.totalUnits, 0);
  const evidenceIds = unique([...program.evidenceIds, ...program.requirements.flatMap((requirement) => requirement.evidenceIds)]);
  const candidate: RouteCandidate = {
    id: `${pathwayId}-${strategy}`,
    pathwayId,
    strategy,
    ...strategyLabel(strategy),
    terms,
    estimatedTransferTerm: transferAfter(terms),
    totalPlannedUnits,
    requirementCoverage: program.requirements.length === 0 ? 0 : satisfied / program.requirements.length,
    overlapScore: strategy === "overlap" ? 0.92 : strategy === "balanced" ? 0.78 : 0.84,
    issues: [],
    evidenceIds,
    assumptions: [
      "Known course offerings are planning assumptions, not registration guarantees.",
      "ASSIST equivalencies marked for review must be confirmed with a counselor.",
      ...(options.reviewResolutions?.length ? [`${options.reviewResolutions.length} course match is counselor-confirmed and remains separate from verified source evidence.`] : []),
    ],
    valid: true,
  };
  candidate.issues = routeValidator.validate(candidate, profile, options.reviewResolutions);
  const missing = requiredCourseIds(pathwayId, profile, strategy).filter((id) => !completed.has(id) && !placed.has(id));
  if (missing.length > 0) {
    candidate.issues.push({ id: `missing-${strategy}`, severity: "blocker", code: "unresolved_requirement", message: `${missing.length} prerequisite course${missing.length === 1 ? " is" : "s are"} not scheduled.`, affectedIds: missing, evidenceIds, nextAction: "Adjust the course deferral or unit limit." });
  }
  candidate.valid = candidate.issues.every((issue) => issue.severity !== "blocker");
  return candidate;
}

function rejectedSeedCandidate(profile: StudentProfile, pathwayId: string): RouteCandidate {
  const badTerms: TermPlan[] = [
    { id: "spring-2027-invalid", label: "Spring 2027", season: "spring", year: 2027, totalUnits: 5, courses: [plannedCourse("coc-math-212")] },
    { id: "fall-2027-invalid", label: "Fall 2027", season: "fall", year: 2027, totalUnits: 5, courses: [plannedCourse("coc-math-211")] },
  ];
  const candidate: RouteCandidate = { id: `${pathwayId}-rejected`, pathwayId, strategy: "fastest", label: "Rejected candidate", description: "A candidate proposed with Calculus II before Calculus I.", terms: badTerms, estimatedTransferTerm: "Unavailable", totalPlannedUnits: 10, requirementCoverage: 0, overlapScore: 0, issues: [], evidenceIds: ["coc-math-2025"], assumptions: [], valid: false };
  candidate.issues = routeValidator.validate(candidate, profile);
  return candidate;
}

export const planningEngine: PlanningEngine = {
  buildPlan(profile, pathwayId = profile.selectedPathwayId, options = {}) {
    const routes = (["fastest", "overlap", "balanced"] as RouteStrategy[]).map((strategy) => buildCandidate(profile, pathwayId, strategy, options));
    const program = programById.get(pathwayId);
    const completedRequirements = program?.requirements.filter((requirement) => requirement.courseIds.some((id) => profile.courses.some((course) => course.courseId === id && isCompletedWithReviewResolution(course, options.reviewResolutions, requirement.minimumGrade)))).length ?? 0;
    const confirmedCourseIds = new Set(options.reviewResolutions?.map((resolution) => resolution.courseId) ?? []);
    const reviewItems: ValidationIssue[] = profile.courses.filter((course) => course.matchStatus === "uncertain" && !confirmedCourseIds.has(course.courseId)).map((course) => ({ id: `review-${course.courseId}`, severity: "review", code: "uncertain_equivalency", message: `${course.code} ${course.title} needs equivalency review.`, affectedIds: [course.courseId], evidenceIds: ["assist-review"], nextAction: "Confirm the articulation in ASSIST and review it with a counselor." }));
    return {
      pathwayId,
      generatedAt: "2026-07-13T18:00:00.000Z",
      routes,
      rejectedCandidates: [rejectedSeedCandidate(profile, pathwayId)],
      reviewItems,
      coverageSummary: { completed: completedRequirements, total: program?.requirements.length ?? 0, percentage: program?.requirements.length ? Math.round((completedRequirements / program.requirements.length) * 100) : 0 },
    };
  },
};
