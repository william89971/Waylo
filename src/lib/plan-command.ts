import { courses, programs } from "@/lib/academic-data";
import { PlanCommandInterpretationSchema, type PlanChange, type PlanCommandInterpretation, type RouteCandidate } from "@/lib/domain";

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const UNIVERSITY_NAMES = [
  { id: "berkeley", name: "UC Berkeley", aliases: ["uc berkeley", "berkeley"] },
  { id: "ucla", name: "UCLA", aliases: ["ucla"] },
  { id: "ucsd", name: "UC San Diego", aliases: ["uc san diego", "ucsd", "san diego"] },
] as const;

function resolveCourse(command: string) {
  const input = normalized(command);
  return courses
    .map((course) => ({ course, aliases: [course.title, course.code, `${course.code} ${course.title}`].map(normalized) }))
    .filter(({ aliases }) => aliases.some((alias) => input.includes(alias)))
    .sort((left, right) => Math.max(...right.aliases.map((alias) => alias.length)) - Math.max(...left.aliases.map((alias) => alias.length)))[0]?.course;
}

function resolvePathway(command: string) {
  const input = normalized(command);
  return programs
    .map((program) => ({
      program,
      aliases: [
        `${program.universityName} ${program.name}`,
        `${program.universityName} ${program.name} ${program.degree}`,
        `${program.universityId} ${program.name}`,
      ].map(normalized),
    }))
    .filter(({ aliases }) => aliases.some((alias) => input.includes(alias)))
    .sort((left, right) => Math.max(...right.aliases.map((alias) => alias.length)) - Math.max(...left.aliases.map((alias) => alias.length)))[0]?.program;
}

function formatTerm(season: string, year: string) {
  return `${season[0].toUpperCase()}${season.slice(1).toLowerCase()} ${year}`;
}

function coursePlacement(route: RouteCandidate | undefined, courseId: string) {
  return route?.terms.find((term) => term.courses.some((course) => course.courseId === courseId))?.label;
}

export interface SeededPlanCommandContext {
  activeRoute?: RouteCandidate;
  selectedPathwayId?: string;
  selectedDestinationIds?: string[];
}

export function parseSeededPlanCommand(command: string, context: SeededPlanCommandContext = {}): PlanCommandInterpretation {
  const input = command.trim();
  const lower = input.toLowerCase();
  const changes: PlanChange[] = [];
  const clarificationItems: string[] = [];

  const workHours = /(?:work|working)\s+(\d{1,2})\s+hours?(?:\s+(?:each|a|per)\s+week|\s+weekly)?/i.exec(input);
  if (workHours) {
    const hours = Number(workHours[1]);
    if (hours <= 80) changes.push({ id: "weekly-work-hours", type: "set_weekly_work_hours", hours });
    else clarificationItems.push("Weekly work hours must be between 0 and 80.");
  }

  const wantsCourseChange = /\b(remove|defer|delay|drop|move)\b/i.test(input);
  const wantsRestore = /\b(restore|put back|add back)\b/i.test(input);
  if (wantsCourseChange || wantsRestore) {
    const course = resolveCourse(input);
    if (course) {
      if (wantsRestore) {
        changes.push({ id: `restore-${course.id}`, type: "restore_course", courseId: course.id, courseCode: course.code, courseTitle: course.title });
      } else {
        const namedTermMatch = /\b(?:from|in)\s+(fall|spring|summer)\s+(20\d{2})\b/i.exec(input);
        const namedTerm = namedTermMatch ? formatTerm(namedTermMatch[1], namedTermMatch[2]) : undefined;
        const actualTerm = coursePlacement(context.activeRoute, course.id);
        if (namedTerm && actualTerm && namedTerm !== actualTerm) {
          clarificationItems.push(`${course.title} is currently in ${actualTerm}, not ${namedTerm}. Choose the displayed term before Waylo moves it.`);
        } else {
          changes.push({ id: `defer-${course.id}`, type: "defer_course", courseId: course.id, courseCode: course.code, courseTitle: course.title, namedTerm });
        }
      }
    } else {
      clarificationItems.push("Name a course from the supported College of the Canyons catalog.");
    }
  }

  if (/\breplace\b/i.test(input)) {
    clarificationItems.push("Name both supported courses. Waylo can replace a course only when the selected pathway has a verified alternative for the same requirement.");
  }

  if (/\b(no|avoid|without|disallow|do not use|don't use)\b.{0,24}\bsummer\b|\bsummer\b.{0,24}\b(no|avoid|without|disallow)\b/i.test(lower)) {
    changes.push({ id: "summer-off", type: "set_summer_enrollment", enabled: false, courseLimit: 0 });
  } else if (/\b(use|allow|include|with)\b.{0,30}\bsummer\b|\bsummer classes?\b/i.test(lower)) {
    const limitMatch = /\b(one|two|three|[1-3])\s+summer\s+courses?/i.exec(lower);
    const limit = limitMatch ? ({ one: 1, two: 2, three: 3 }[limitMatch[1] as "one" | "two" | "three"] ?? Number(limitMatch[1])) : 1;
    changes.push({ id: "summer-on", type: "set_summer_enrollment", enabled: true, courseLimit: limit });
  }

  const maxUnits = /(?:maximum|max|no more than|cap(?: me)? at)\s+(\d{1,2})\s+units?/i.exec(input);
  if (maxUnits) {
    const units = Number(maxUnits[1]);
    if (units >= 6 && units <= 20) changes.push({ id: "max-units", type: "set_max_units", units });
    else clarificationItems.push("The supported semester unit cap is 6 to 20 units.");
  }

  const targetMatches = [...input.matchAll(/\b(fall|spring|summer)\s+(20\d{2})\b/gi)];
  const target = targetMatches.at(-1);
  if (target) {
    const term = formatTerm(target[1], target[2]);
    const policy = /\b(hard|must|no later than|by)\b/i.test(input) && !/\b(close|preferred|as close as possible)\b/i.test(input) ? "hard" : "preferred";
    changes.push({ id: "transfer-target", type: "set_transfer_target", term, policy });
  } else if (/\b(target|transfer)\b/i.test(input)) {
    clarificationItems.push("Include a transfer target such as Fall 2028.");
  }

  if (/\b(switch|change|route)\b.{0,36}\b(pathway|major|program)\b|\bpathway\b.{0,36}\b(to|switch|change)\b/i.test(lower)) {
    const pathway = resolvePathway(input);
    if (pathway) changes.push({ id: "set-pathway", type: "set_pathway", pathwayId: pathway.id, pathwayLabel: `${pathway.universityName} ${pathway.name} ${pathway.degree}` });
    else clarificationItems.push("Choose one of Waylo's six supported university-program pathways.");
  }

  for (const university of UNIVERSITY_NAMES) {
    const mentioned = university.aliases.some((alias) => normalized(input).includes(normalized(alias)));
    if (!mentioned) continue;
    if (/\b(remove|drop|exclude)\b/i.test(input) && /\b(destination|university)\b/i.test(input)) changes.push({ id: `remove-${university.id}`, type: "remove_destination", universityId: university.id, universityName: university.name });
    if (/\b(add|include)\b/i.test(input) && /\b(destination|university)\b/i.test(input)) changes.push({ id: `add-${university.id}`, type: "add_destination", universityId: university.id, universityName: university.name });
  }

  if (changes.length === 0 && clarificationItems.length === 0) {
    clarificationItems.push("Try changing a course placement, summer enrollment, unit cap, work schedule, transfer target, supported pathway, or destination.");
  }

  const parts = changes.map((change) => {
    if (change.type === "defer_course") return `recalculate ${change.courseCode} outside ${change.namedTerm ?? "its current route position"}`;
    if (change.type === "restore_course") return `restore ${change.courseCode}`;
    if (change.type === "replace_course") return `replace ${change.courseCode} with ${change.replacementCourseCode}`;
    if (change.type === "set_summer_enrollment") return `${change.enabled ? `allow up to ${change.courseLimit ?? 1} summer course${(change.courseLimit ?? 1) === 1 ? "" : "s"}` : "avoid summer terms"}`;
    if (change.type === "set_summer_limit") return `limit summer to ${change.coursesPerTerm} courses per term`;
    if (change.type === "set_max_units") return `set a hard ${change.units}-unit term cap`;
    if (change.type === "set_transfer_target") return `keep ${change.term} as a ${change.policy} transfer target`;
    if (change.type === "set_pathway") return `change the pathway to ${change.pathwayLabel}`;
    if (change.type === "set_weekly_work_hours") return `consider ${change.hours} weekly work hours as advisory context`;
    return `${change.type === "add_destination" ? "add" : "remove"} ${change.universityName} as a destination`;
  });
  return PlanCommandInterpretationSchema.parse({
    summary: parts.length ? `Waylo will ${parts.join(", ")}.` : "Waylo needs one detail before it can simulate this request.",
    changes,
    confidence: clarificationItems.length ? 0.62 : 0.96,
    clarificationItems,
    source: "seeded",
  });
}

export function validateBoundedInterpretation(interpretation: PlanCommandInterpretation): PlanCommandInterpretation {
  const allowedCourses = new Set(courses.map((course) => course.id));
  const allowedPathways = new Set(programs.map((program) => program.id));
  const allowedDestinations = new Set<string>(UNIVERSITY_NAMES.map((item) => item.id));
  const changes = interpretation.changes.filter((change) => {
    if (change.type === "defer_course" || change.type === "restore_course") return allowedCourses.has(change.courseId);
    if (change.type === "replace_course") {
      if (!allowedCourses.has(change.courseId) || !allowedCourses.has(change.replacementCourseId)) return false;
      return programs.some((program) => program.requirements.some((requirement) => requirement.id === change.requirementId && requirement.courseIds.includes(change.courseId) && requirement.courseIds.includes(change.replacementCourseId)));
    }
    if (change.type === "set_pathway") return allowedPathways.has(change.pathwayId);
    if (change.type === "add_destination" || change.type === "remove_destination") return allowedDestinations.has(change.universityId);
    return true;
  });
  return PlanCommandInterpretationSchema.parse({ ...interpretation, changes });
}
