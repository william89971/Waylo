import type { SelectableTarget, StudentWorkspaceRecord } from "@/lib/production-types";

export type StrategyBlock = {
  title: string;
  body: string;
};

export type AdmissionsStrategy = {
  grades: StrategyBlock;
  counselor: { title: string; items: string[] };
  disclaimer: string;
  teaser: string;
};

export type StrategyContext = {
  hasValidPlan: boolean;
  plannedCourseCodes: string[];
  reviewItemCount: number;
};

const TARGET_TERM = /^(Fall|Spring|Summer) \d{4}$/;
const RIGOR_PATTERN = /(MATH|CALC|COMP SCI|CHEM|PHYS|BIOSCI|STAT)/i;

export function isPreferredTransferTerm(value: string): boolean {
  return TARGET_TERM.test(value.trim());
}

function selectedTargets(workspace: StudentWorkspaceRecord, targets: SelectableTarget[]) {
  const ids = new Set([workspace.primaryTargetId, ...(workspace.secondaryTargetIds ?? [])]);
  return targets.filter((target) => ids.has(target.id));
}

function primaryTarget(workspace: StudentWorkspaceRecord, targets: SelectableTarget[]) {
  return targets.find((target) => target.id === workspace.primaryTargetId);
}

export function buildAdmissionsStrategy(
  workspace: StudentWorkspaceRecord,
  targets: SelectableTarget[],
  context: StrategyContext,
): AdmissionsStrategy | null {
  if (!context.hasValidPlan) return null;

  const primary = primaryTarget(workspace, targets);
  const chosen = selectedTargets(workspace, targets);
  const goal = primary
    ? `${primary.displayName} at ${primary.institutionName}`
    : "your transfer major";

  const completed = workspace.courses.filter((course) => course.status === "completed");
  const missingGrades = completed.filter((course) => !course.grade).length;
  const rigorCodes = context.plannedCourseCodes.filter((code) => RIGOR_PATTERN.test(code));
  const constraintQuestions = chosen
    .flatMap((target) => target.constraintNotes.map((note) => ({ target, note })))
    .slice(0, 2);
  const hasArchetype = chosen.some((target) => target.coverageTier === "archetype");
  const hasReviewedAssist = chosen.some(
    (target) => target.coverageTier === "reviewed" || target.coverageTier === "full",
  );

  const gradeBits: string[] = [
    `For transfer planning toward ${goal}, start with the coursework and grades on this schedule. Waylo does not rank applicants or assign a GPA cutoff.`,
  ];
  if (rigorCodes.length) {
    gradeBits.push(
      `This schedule includes sequenced prep such as ${rigorCodes.slice(0, 3).join(", ")}. Take the next required course at the level the major needs, rather than extra electives that do not move a requirement forward.`,
    );
  } else {
    gradeBits.push(
      "Take the next required prep course at a level that matches the major, not extra electives that do not move the requirement forward.",
    );
  }
  if (hasReviewedAssist) {
    gradeBits.push(
      "For campuses with reviewed ASSIST agreements in Waylo, confirm the current agreement with a counselor before you enroll.",
    );
  }
  if (hasArchetype) {
    gradeBits.push(
      "At least one selected campus is a planning estimate here, not a reviewed ASSIST pathway. Confirm required prep with that university or a counselor.",
    );
  }
  if (missingGrades) {
    gradeBits.push(
      `${missingGrades} completed ${missingGrades === 1 ? "course is" : "courses are"} missing a grade. Confirm those marks with a counselor before you treat the plan as complete.`,
    );
  }

  const counselorItems: string[] = [];
  if (context.reviewItemCount > 0) {
    counselorItems.push(
      `Ask a counselor to confirm the ${context.reviewItemCount} articulation ${context.reviewItemCount === 1 ? "item" : "items"} marked for review before you enroll.`,
    );
  }
  for (const { target, note } of constraintQuestions) {
    counselorItems.push(`Confirm this note for ${target.institutionName} ${target.displayName}: ${note}`);
  }
  if (hasArchetype) {
    counselorItems.push(
      "One or more selected campuses use a planning estimate, not a reviewed ASSIST pathway. Confirm required prep directly with that university or a counselor.",
    );
  }
  if (chosen.some((target) => !target.recognizesIgetc)) {
    counselorItems.push(
      "At least one selected private university does not recognize IGETC. Ask which general-education or language requirements still apply.",
    );
  }
  if (!counselorItems.length) {
    counselorItems.push(
      "Bring this plan to a College of the Canyons counselor and confirm each equivalency in the current ASSIST agreement before enrollment.",
    );
  }

  return {
    grades: {
      title: "Coursework and grades come first",
      body: gradeBits.join(" "),
    },
    counselor: {
      title: "What to take to a counselor",
      items: counselorItems.slice(0, 4),
    },
    disclaimer:
      "Planning guidance — not verified articulation and not an admission prediction. Waylo does not estimate how an office will decide, and it does not replace a College of the Canyons counselor.",
    teaser: `For ${goal}, coursework and grades on this plan come first.`,
  };
}
