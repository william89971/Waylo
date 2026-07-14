import { courseById, evidenceById, programById } from "@/lib/academic-data";
import type { CounselorInquiry, EvidenceReference, PlanResult, StudentProfile } from "@/lib/domain";
import { planningEngine } from "@/lib/planning-engine";

export function evidenceForIssue(courseId: string, pathwayId: string): EvidenceReference[] {
  const course = courseById.get(courseId);
  const program = programById.get(pathwayId);
  const ids = new Set([...(course?.evidenceIds ?? []), ...(program?.evidenceIds ?? []), "assist-review"]);
  return [...ids].map((id) => evidenceById.get(id)).filter((item): item is EvidenceReference => Boolean(item));
}

export function buildCounselorInquiry(courseId: string, pathwayId: string): CounselorInquiry {
  const course = courseById.get(courseId);
  const program = programById.get(pathwayId);
  const sources = evidenceForIssue(courseId, pathwayId);
  const sourceLines = sources.map((source) => `- ${source.title} (${source.effectiveYear}): ${source.note} ${source.url}`);
  return {
    id: `inquiry-${courseId}-${pathwayId}`,
    subject: `Request to review ${course?.code ?? courseId} for ${program?.name ?? "my transfer pathway"}`,
    body: [
      "Hello,",
      "",
      `I am building a transfer plan from College of the Canyons to ${program ? `${program.universityName} ${program.name} ${program.degree}` : pathwayId}; could you review whether ${course ? `${course.code} ${course.title}` : courseId} satisfies the applicable preparation requirement?`,
      "",
      "Waylo found these sources:",
      ...sourceLines,
      "",
      "These records establish the College of the Canyons course identity and the destination program's published preparation. They do not, by themselves, settle the exact equivalency. Please help me confirm the current ASSIST agreement and any conditions that apply.",
      "",
      "Thank you.",
    ].join("\n"),
    evidenceIds: sources.map((source) => source.id),
    createdAt: "2026-07-13T18:00:00.000Z",
  };
}

export function alternateRoutesWithoutCourse(profile: StudentProfile, courseId: string): Array<{ pathwayId: string; label: string; plan: PlanResult }> {
  return [...programById.values()]
    .filter((program) => !program.requirements.some((requirement) => requirement.courseIds.includes(courseId)))
    .map((program) => ({
      pathwayId: program.id,
      label: `${program.universityName} ${program.name} ${program.degree}`,
      plan: planningEngine.buildPlan({ ...profile, selectedPathwayId: program.id }, program.id),
    }))
    .filter((candidate) => candidate.plan.routes.some((route) => route.valid));
}
