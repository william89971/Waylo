import type { UnitSystem } from "@/lib/articulation/types";

/** 1.0 semester unit = 1.5 quarter units. Applied only at the audit layer. */
export const SEMESTER_TO_QUARTER = 1.5;

export function toQuarterUnits(semesterUnits: number): number {
  return Number((semesterUnits * SEMESTER_TO_QUARTER).toFixed(4));
}

export function toSemesterUnits(quarterUnits: number): number {
  return Number((quarterUnits / SEMESTER_TO_QUARTER).toFixed(4));
}

export function convertUnits(units: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return units;
  if (from === "semester" && to === "quarter") return toQuarterUnits(units);
  return toSemesterUnits(units);
}

export function juniorStandingThreshold(unitSystem: UnitSystem): number {
  return unitSystem === "quarter" ? 90 : 60;
}

export function articulatedUnitsForAudit(semesterUnits: number, targetSystem: UnitSystem): number {
  return convertUnits(semesterUnits, "semester", targetSystem);
}
