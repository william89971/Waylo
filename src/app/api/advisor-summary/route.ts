import { z } from "zod";
import { constraintsFromProfile } from "@/lib/academic-twin";
import { buildAdvisorDecisionPacket } from "@/lib/advisor-summary";
import { programs, seedProfile } from "@/lib/academic-data";
import { planningEngine } from "@/lib/planning-engine";
import { createRequestId, jsonWithRequestId, logSanitizedRequest, readLimitedJson, RequestSafetyError } from "@/lib/server/request-safety";

export const runtime = "nodejs";

const RequestSchema = z.object({
  mode: z.enum(["seeded", "live"]).default("seeded"),
  pathwayId: z.string().optional(),
}).strict();

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let mode: "seeded" | "live" = "seeded";
  try {
    const body = await readLimitedJson(request, RequestSchema);
    mode = body.mode;
    if (mode === "live") {
      logSanitizedRequest({ requestId, endpoint: "advisor", mode, outcome: "rejected", category: "live_advisor_disabled", durationMs: Date.now() - startedAt });
      return jsonWithRequestId({ error: "live_advisor_disabled", message: "The public live advisor endpoint is disabled. Use the deterministic printable packet.", seededModeAvailable: true }, requestId, { status: 403 });
    }
    const pathwayId = programs.some((program) => program.id === body.pathwayId) ? body.pathwayId! : seedProfile.selectedPathwayId;
    const profile = { ...seedProfile, selectedPathwayId: pathwayId };
    const constraints = constraintsFromProfile(profile);
    const plan = planningEngine.buildPlan(profile, pathwayId, {
      includeSummer: constraints.summerEnrollment,
      summerCourseLimit: constraints.summerCourseLimit,
      maxUnits: constraints.maxUnits,
      weeklyWorkHours: constraints.weeklyWorkHours,
    });
    const packet = buildAdvisorDecisionPacket(profile, plan, [], constraints);
    logSanitizedRequest({ requestId, endpoint: "advisor", mode, outcome: "complete", durationMs: Date.now() - startedAt });
    return jsonWithRequestId({ mode: "seeded", packet }, requestId);
  } catch (error) {
    const status = error instanceof RequestSafetyError ? error.status : 400;
    const code = error instanceof RequestSafetyError ? error.code : "invalid_request";
    logSanitizedRequest({ requestId, endpoint: "advisor", mode, outcome: "rejected", category: code, durationMs: Date.now() - startedAt });
    return jsonWithRequestId({ error: code, message: "The advisor summary request is invalid." }, requestId, { status });
  }
}
