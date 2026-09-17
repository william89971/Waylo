import { evaluateCalGetc } from "@/lib/articulation/cal-getc";
import { isExternalCreditId } from "@/lib/articulation/external-credit";
import {
  courseClosesListedPrep,
  graphCodeForStudentCourse,
} from "@/lib/articulation/student-history";
import type { ArticulationGraph, MultiTargetPlanResult, VerificationTier } from "@/lib/articulation/types";
import type { ProductionCourse, SelectableTarget } from "@/lib/production-types";
import { studentFacingConstraintNotes } from "@/lib/student-facing-copy";

export type CounselorConfirmationItem = {
  id: string;
  kind: "unverified_articulation" | "unmatched_course" | "ap_credit" | "other_college" | "cal_getc" | "petition";
  title: string;
  detail: string;
};

export function buildCounselorConfirmationItems(input: {
  courses: ProductionCourse[];
  graph: ArticulationGraph;
  plan: MultiTargetPlanResult | undefined;
  targets?: SelectableTarget[];
}): CounselorConfirmationItem[] {
  const items: CounselorConfirmationItem[] = [];
  const completedCodes = new Set(
    input.courses.flatMap((course) => {
      if (course.status !== "completed") return [];
      const code = graphCodeForStudentCourse(course, input.graph);
      return code ? [code] : [];
    }),
  );

  for (const course of input.courses) {
    if (course.status !== "completed") continue;
    if (course.catalogCourseId.startsWith("ap:") || course.source === "ap") {
      items.push({
        id: `ap-${course.id}`,
        kind: "ap_credit",
        title: `${course.code} — AP credit`,
        detail: "Ask a counselor whether this AP credit counts. Waylo does not treat it as done.",
      });
      continue;
    }
    if (course.catalogCourseId.startsWith("petition:") || course.source === "petition") {
      items.push({
        id: `petition-${course.id}`,
        kind: "petition",
        title: `${course.code} — petition`,
        detail: "Ask a counselor whether this substitution counts.",
      });
      continue;
    }
    if (isExternalCreditId(course.catalogCourseId) || course.matchStatus === "uncertain") {
      items.push({
        id: `ext-${course.id}`,
        kind: course.catalogCourseId.startsWith("ext:") ? "other_college" : "unmatched_course",
        title: `${course.code} ${course.title}`,
        detail: "Saved, but not matched to a listed requirement. Ask a counselor whether it counts.",
      });
      continue;
    }
    if (!courseClosesListedPrep(course, input.graph)) {
      items.push({
        id: `recorded-${course.id}`,
        kind: "unmatched_course",
        title: `${course.code} is on your record`,
        detail: "Saved, but it does not close a listed major-prep requirement. Ask whether it counts for Cal-GETC or something else.",
      });
    }
  }

  for (const audit of input.plan?.auditSummary ?? []) {
    for (const requirement of audit.requirementStates) {
      if (requirement.verificationTier === "NEEDS_COUNSELOR_CONFIRMATION") {
        items.push({
          id: `req-${audit.targetMajorId}-${requirement.requirementKey}`,
          kind: "unverified_articulation",
          title: `${requirement.label}`,
          detail: "No official agreement in Waylo yet. Ask a counselor before you treat this as done.",
        });
      }
    }
  }

  const selected = input.targets ?? [];
  for (const target of selected) {
    for (const note of studentFacingConstraintNotes(target.constraintNotes)) {
      items.push({
        id: `note-${target.id}-${note.slice(0, 24)}`,
        kind: "petition",
        title: `${target.institutionName} ${target.displayName}`,
        detail: note,
      });
    }
  }

  const calGetc = evaluateCalGetc(completedCodes);
  const possible = calGetc.filter((area) => area.status === "confirm_possible");
  items.push({
    id: "calgetc",
    kind: "cal_getc",
    title: "Cal-GETC is not certified",
    detail: possible.length
      ? `Typical placements only: ${possible.map((area) => area.label).join("; ")}. Confirm current Cal-GETC with a counselor.`
      : "Ask a counselor which GE classes still apply.",
  });

  return items;
}

export function verificationNeedsCounselor(tier: VerificationTier | undefined) {
  return tier === "NEEDS_COUNSELOR_CONFIRMATION" || tier === "PLANNING_SUGGESTION" || tier === "HISTORICAL_PRECEDENT";
}
