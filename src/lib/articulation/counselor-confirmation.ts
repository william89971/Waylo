import { evaluateCalGetc } from "@/lib/articulation/cal-getc";
import { isExternalCreditId } from "@/lib/articulation/external-credit";
import {
  courseClosesListedPrep,
  graphCodeForStudentCourse,
} from "@/lib/articulation/student-history";
import type { ArticulationGraph, MultiTargetPlanResult, VerificationTier } from "@/lib/articulation/types";
import type { ProductionCourse, SelectableTarget } from "@/lib/production-types";

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
        title: `${course.code} — counselor confirmation required`,
        detail: "AP credit is recorded as pending. It does not satisfy a requirement until a counselor or the university confirms it.",
      });
      continue;
    }
    if (course.catalogCourseId.startsWith("petition:") || course.source === "petition") {
      items.push({
        id: `petition-${course.id}`,
        kind: "petition",
        title: `${course.code} — petition pending`,
        detail: "This petition or substitution is saved as pending. It does not change the plan until a counselor or the university confirms it.",
      });
      continue;
    }
    if (isExternalCreditId(course.catalogCourseId) || course.matchStatus === "uncertain") {
      items.push({
        id: `ext-${course.id}`,
        kind: course.catalogCourseId.startsWith("ext:") ? "other_college" : "unmatched_course",
        title: `${course.code} ${course.title} — unmatched`,
        detail: "This class is saved, but Waylo cannot match it to a listed College of the Canyons transfer requirement. A counselor has to confirm whether it counts.",
      });
      continue;
    }
    if (!courseClosesListedPrep(course, input.graph)) {
      items.push({
        id: `recorded-${course.id}`,
        kind: "unmatched_course",
        title: `${course.code} is on your record`,
        detail: "This College of the Canyons class is saved. It does not close a listed major-prep requirement in Waylo. Ask a counselor whether it counts for Cal-GETC or another requirement.",
      });
    }
  }

  for (const audit of input.plan?.auditSummary ?? []) {
    for (const requirement of audit.requirementStates) {
      if (requirement.verificationTier === "NEEDS_COUNSELOR_CONFIRMATION") {
        items.push({
          id: `req-${audit.targetMajorId}-${requirement.requirementKey}`,
          kind: "unverified_articulation",
          title: `${requirement.label} — counselor confirmation required`,
          detail: "Waylo does not have an official agreement for this requirement. It is not treated as fact.",
        });
      }
    }
  }

  const selected = input.targets ?? [];
  for (const target of selected) {
    for (const note of target.constraintNotes) {
      items.push({
        id: `note-${target.id}-${note.slice(0, 24)}`,
        kind: "petition",
        title: `${target.institutionName} ${target.displayName} — institution-specific`,
        detail: `${note} Confirm with a counselor. Waylo does not treat this as satisfied.`,
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
      ? `${possible.map((area) => area.label).join("; ")}. Those classes are typical placements only. Confirm current Cal-GETC with a counselor.`
      : "No listed course on your record is a typical Cal-GETC placement. Ask a counselor which GE classes still apply. Waylo does not certify GE completion.",
  });

  return items;
}

export function verificationNeedsCounselor(tier: VerificationTier | undefined) {
  return tier === "NEEDS_COUNSELOR_CONFIRMATION" || tier === "PLANNING_SUGGESTION" || tier === "HISTORICAL_PRECEDENT";
}
