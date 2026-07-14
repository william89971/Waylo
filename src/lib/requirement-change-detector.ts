import { courseById, programById } from "@/lib/academic-data";
import { ACADEMIC_DATA_VERSION } from "@/lib/planning-engine";
import { RequirementChangeComparisonSchema, type RequirementChangeComparison, type RouteCandidate } from "@/lib/domain";

const DISCLAIMER = "Controlled evaluation fixture only. This comparison is not a real catalog, ASSIST, or university requirement update and must not be used for enrollment decisions.";

export function compareControlledRequirementVersions(pathwayId: string, route?: RouteCandidate): RequirementChangeComparison {
  const program = programById.get(pathwayId);
  if (!program) throw new Error("Unsupported pathway");
  const requirement = program.requirements.find((item) => item.id.includes("linear")) ?? program.requirements[0];
  const courseId = requirement?.courseIds[0];
  if (!requirement || !courseId) throw new Error("No bounded requirement is available for comparison");
  const course = courseById.get(courseId);
  const fromVersionId = `${pathwayId}-${ACADEMIC_DATA_VERSION}`;
  const toVersionId = `${pathwayId}-controlled-next-version`;
  const change = {
    id: `controlled-change-${pathwayId}-${requirement.id}`,
    pathwayId,
    fromVersionId,
    toVersionId,
    status: "proposed" as const,
    affectedRequirementIds: [requirement.id],
    affectedCourseIds: [courseId],
    summary: `Controlled fixture: ${requirement.label} is marked for renewed source review. No real requirement change is being claimed.`,
  };
  const affectedSegments = route?.terms.flatMap((term) => term.courses
    .filter((item) => item.courseId === courseId)
    .map(() => ({ routeId: route.id, courseId, courseCode: course?.code ?? courseId, term: term.label, state: "proposed" as const }))) ?? [];
  return RequirementChangeComparisonSchema.parse({
    mode: "controlled-fixture",
    disclaimer: DISCLAIMER,
    fromVersion: {
      id: fromVersionId,
      pathwayId,
      academicYear: "2025-26 current Waylo dataset",
      sourceIds: [...program.evidenceIds, "assist-review"],
      retrievedAt: "2026-07-13",
      fingerprint: `${ACADEMIC_DATA_VERSION}:${pathwayId}`,
      status: "verified",
    },
    toVersion: {
      id: toVersionId,
      pathwayId,
      academicYear: "Controlled next-version fixture",
      sourceIds: [...program.evidenceIds, "assist-review"],
      retrievedAt: "2026-07-13",
      fingerprint: `controlled-fixture:${pathwayId}:${requirement.id}`,
      status: "controlled-fixture",
    },
    changes: [change],
    affectedSegments,
  });
}
