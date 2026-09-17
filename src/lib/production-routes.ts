import { CLASS_LOAD_OPTIONS, classLoadFromUnits } from "@/lib/admissions-strategy";
import { computeMultiTargetPlan, type AcademicHistoryCourse } from "@/lib/articulation/multi-target-plan";
import type { ArticulationGraph, MultiTargetPlanResult } from "@/lib/articulation/types";
import type { StudentWorkspaceRecord } from "@/lib/production-types";

export type RouteKnobs = {
  maxUnits: number;
  summerEnrollment: boolean;
  includeSecondaryDivergence: boolean;
};

export type ProductionRouteOption = {
  id: string;
  title: string;
  knobs: RouteKnobs;
  selected: boolean;
  nextTermLabel: string;
  nextTermCodes: string[];
  nextTermUnits: number;
  finishTerm: string;
  targetTerm: string | null;
  reachesTarget: boolean | null;
};

export function routeKnobsFromWorkspace(workspace: StudentWorkspaceRecord): RouteKnobs {
  return {
    maxUnits: workspace.preferences.maxUnits,
    summerEnrollment: workspace.preferences.summerEnrollment,
    includeSecondaryDivergence: workspace.includeSecondaryDivergence,
  };
}

export function routePreferenceId(knobs: RouteKnobs): string {
  return [
    knobs.maxUnits,
    knobs.summerEnrollment ? "summer" : "ay",
    knobs.includeSecondaryDivergence ? "all" : "primary",
  ].join("-");
}

export function loadPhrase(units: number): string {
  const load = classLoadFromUnits(units);
  return `${load.classes} classes · ${load.hint}`;
}

export function listRouteKnobVariants(workspace: StudentWorkspaceRecord): RouteKnobs[] {
  const current = routeKnobsFromWorkspace(workspace);
  const variants: RouteKnobs[] = [current];
  variants.push({ ...current, summerEnrollment: !current.summerEnrollment });
  if ((workspace.secondaryTargetIds ?? []).length) {
    variants.push({ ...current, includeSecondaryDivergence: !current.includeSecondaryDivergence });
  } else {
    const otherLoad = CLASS_LOAD_OPTIONS.find((option) => option.units !== current.maxUnits);
    if (otherLoad) variants.push({ ...current, maxUnits: otherLoad.units });
  }
  return variants;
}

export function routeTitle(knobs: RouteKnobs, current: RouteKnobs): string {
  if (routePreferenceId(knobs) === routePreferenceId(current)) {
    const bits = [loadPhrase(knobs.maxUnits)];
    if (knobs.summerEnrollment) bits.push("summer");
    if (!knobs.includeSecondaryDivergence) bits.push("first-choice only");
    return `Your route · ${bits.join(" · ")}`;
  }
  if (knobs.summerEnrollment !== current.summerEnrollment) {
    return knobs.summerEnrollment ? "Add summer sessions" : "Fall and spring only";
  }
  if (knobs.includeSecondaryDivergence !== current.includeSecondaryDivergence) {
    return knobs.includeSecondaryDivergence ? "Cover every selected school" : "First-choice school only";
  }
  return loadPhrase(knobs.maxUnits);
}

export function scheduleFingerprint(plan: MultiTargetPlanResult): string {
  return plan.schedule.terms
    .map((term) => `${term.label}:${term.courses.map((course) => course.code).join(",")}`)
    .join("|");
}

function termOrdinal(label: string): number | null {
  const match = /^(Fall|Spring|Summer) (\d{4})$/.exec(label.trim());
  if (!match) return null;
  const season = match[1] === "Spring" ? 0 : match[1] === "Summer" ? 1 : 2;
  return Number(match[2]) * 3 + season;
}

export function reachesPreferredTerm(finishTerm: string, targetTerm: string | null): boolean | null {
  if (!targetTerm) return null;
  const finish = termOrdinal(finishTerm);
  const target = termOrdinal(targetTerm);
  if (finish === null || target === null) return null;
  return finish <= target;
}

export function toRouteOption(
  plan: MultiTargetPlanResult,
  knobs: RouteKnobs,
  current: RouteKnobs,
  targetTerm: string | null,
): ProductionRouteOption {
  const next = plan.schedule.terms[0];
  const finishTerm = plan.schedule.terms.at(-1)?.label ?? next?.label ?? "Unscheduled";
  return {
    id: routePreferenceId(knobs),
    title: routeTitle(knobs, current),
    knobs,
    selected: routePreferenceId(knobs) === routePreferenceId(current),
    nextTermLabel: next?.label ?? "Next semester",
    nextTermCodes: next?.courses.map((course) => course.code) ?? [],
    nextTermUnits: next?.totalSemesterUnits ?? 0,
    finishTerm,
    targetTerm,
    reachesTarget: reachesPreferredTerm(finishTerm, targetTerm),
  };
}

export function uniqueRouteOptions(options: Array<{ option: ProductionRouteOption; fingerprint: string }>): ProductionRouteOption[] {
  const seen = new Set<string>();
  const unique: ProductionRouteOption[] = [];
  for (const { option, fingerprint } of options) {
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    unique.push(option);
    if (unique.length === 3) break;
  }
  return unique;
}

export function buildProductionRouteOptions(
  workspace: StudentWorkspaceRecord,
  graph: ArticulationGraph,
  history: AcademicHistoryCourse[],
): ProductionRouteOption[] {
  const current = routeKnobsFromWorkspace(workspace);
  const targetTerm = workspace.preferences.targetTerm;
  const primaryTargetId = workspace.primaryTargetId;
  const secondaryTargetIds = workspace.secondaryTargetIds ?? [];
  const scored = listRouteKnobVariants(workspace).map((knobs) => {
    const plan = computeMultiTargetPlan({
      history,
      primaryTargetId,
      secondaryTargetIds,
      maxUnitsPerTerm: knobs.maxUnits,
      includeSecondaryDivergence: knobs.includeSecondaryDivergence,
      includeSummer: knobs.summerEnrollment,
      graph,
    });
    return {
      option: toRouteOption(plan, knobs, current, targetTerm),
      fingerprint: scheduleFingerprint(plan),
    };
  });
  return uniqueRouteOptions(scored);
}
