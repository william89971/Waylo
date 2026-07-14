import { courses } from "@/lib/academic-data";
import { PlanCommandInterpretationSchema, type PlanChange, type PlanCommandInterpretation } from "@/lib/domain";

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resolveCourse(command: string) {
  const input = normalized(command);
  return courses
    .map((course) => ({
      course,
      aliases: [course.title, course.code, `${course.code} ${course.title}`].map(normalized),
    }))
    .filter(({ aliases }) => aliases.some((alias) => input.includes(alias)))
    .sort((left, right) => Math.max(...right.aliases.map((alias) => alias.length)) - Math.max(...left.aliases.map((alias) => alias.length)))[0]?.course;
}

export function parseSeededPlanCommand(command: string): PlanCommandInterpretation {
  const input = command.trim();
  const lower = input.toLowerCase();
  const changes: PlanChange[] = [];
  const clarificationItems: string[] = [];
  const wantsCourseChange = /\b(remove|defer|delay|drop|move)\b/i.test(input);
  if (wantsCourseChange) {
    const course = resolveCourse(input);
    if (course) {
      changes.push({ id: `defer-${course.id}`, type: "defer_course", courseId: course.id, courseCode: course.code, courseTitle: course.title });
    } else {
      clarificationItems.push("Name a course from the supported College of the Canyons catalog.");
    }
  }

  if (/\b(no|avoid|without|disallow|do not use|don't use)\b.{0,24}\bsummer\b|\bsummer\b.{0,24}\b(no|avoid|without|disallow)\b/i.test(lower)) {
    changes.push({ id: "summer-off", type: "set_summer_enrollment", enabled: false });
  } else if (/\b(use|allow|include|with)\b.{0,24}\bsummer\b|\bsummer classes\b/i.test(lower)) {
    changes.push({ id: "summer-on", type: "set_summer_enrollment", enabled: true });
  }

  const target = /\b(fall|spring|summer)\s+(20\d{2})\b/i.exec(input);
  if (target) {
    const season = `${target[1][0].toUpperCase()}${target[1].slice(1).toLowerCase()}`;
    changes.push({ id: "transfer-target", type: "set_transfer_target", term: `${season} ${target[2]}` });
  } else if (/\b(target|transfer)\b/i.test(input)) {
    clarificationItems.push("Include a transfer target such as Fall 2028.");
  }

  if (changes.length === 0 && clarificationItems.length === 0) {
    clarificationItems.push("Try removing or deferring a course, changing summer enrollment, or setting a transfer target.");
  }

  const parts = changes.map((change) => {
    if (change.type === "defer_course") return `recalculate ${change.courseCode} outside its current route position`;
    if (change.type === "set_summer_enrollment") return `${change.enabled ? "allow" : "avoid"} summer terms`;
    return `keep ${change.term} as the transfer target`;
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
  const allowed = new Set(courses.map((course) => course.id));
  return PlanCommandInterpretationSchema.parse({
    ...interpretation,
    changes: interpretation.changes.filter((change) => change.type !== "defer_course" || allowed.has(change.courseId)),
  });
}
