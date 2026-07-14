import { courseById, programById } from "@/lib/academic-data";

export interface PathwaySetComparison {
  shared: string[];
  leftOnly: string[];
  rightOnly: string[];
  unresolved: string[];
  blockers: string[];
}

export function comparePathwayRequirementSets(leftId: string, rightId: string): PathwaySetComparison {
  const left = programById.get(leftId);
  const right = programById.get(rightId);
  const leftSet = new Set(left?.requirements.flatMap((requirement) => requirement.courseIds) ?? []);
  const rightSet = new Set(right?.requirements.flatMap((requirement) => requirement.courseIds) ?? []);
  const labels = (ids: string[]) => ids.map((id) => courseById.get(id)?.code ?? id).sort();
  const sharedIds = [...leftSet].filter((id) => rightSet.has(id));
  const allIds = new Set([...leftSet, ...rightSet]);
  return {
    shared: labels(sharedIds),
    leftOnly: labels([...leftSet].filter((id) => !rightSet.has(id))),
    rightOnly: labels([...rightSet].filter((id) => !leftSet.has(id))),
    unresolved: labels([...allIds].filter((id) => courseById.get(id)?.evidenceIds.includes("assist-review"))),
    blockers: sharedIds.length === 0 ? ["No verified shared course requirement was found in the supported dataset."] : [],
  };
}
