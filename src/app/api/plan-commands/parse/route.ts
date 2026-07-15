import { z } from "zod";
import { academicAIProvider, AIConfigurationError, AIWorkflowError } from "@/lib/ai/provider";
import { beginLiveRequest, LiveDemoError, type LiveRequestLease } from "@/lib/ai/live-demo";
import { constraintsFromProfile } from "@/lib/academic-twin";
import { programs, seedProfile } from "@/lib/academic-data";
import { parseSeededPlanCommand } from "@/lib/plan-command";
import { planningEngine } from "@/lib/planning-engine";
import { createRequestId, jsonWithRequestId, logSanitizedRequest, readLimitedJson, RequestSafetyError } from "@/lib/server/request-safety";

export const runtime = "nodejs";

export const PLAN_COMMAND_MAX_CHARACTERS = 300;

const RequestSchema = z.object({
  mode: z.enum(["seeded", "live"]).default("seeded"),
  command: z.string().trim().min(1).max(PLAN_COMMAND_MAX_CHARACTERS),
  selectedPathwayId: z.string(),
  activeRouteId: z.string().optional(),
}).strict();

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let lease: LiveRequestLease | undefined;
  let mode: "seeded" | "live" = "seeded";
  try {
    const body = await readLimitedJson(request, RequestSchema);
    mode = body.mode;
    if (!programs.some((program) => program.id === body.selectedPathwayId)) throw new Error("unsupported_pathway");

    const trustedProfile = { ...seedProfile, selectedPathwayId: body.selectedPathwayId };
    const constraints = constraintsFromProfile(trustedProfile);
    const plan = planningEngine.buildPlan(trustedProfile, body.selectedPathwayId, {
      includeSummer: constraints.summerEnrollment,
      summerCourseLimit: constraints.summerCourseLimit,
      maxUnits: constraints.maxUnits,
      weeklyWorkHours: constraints.weeklyWorkHours,
    });
    const activeRoute = plan.routes.find((route) => route.id === body.activeRouteId) ?? plan.routes[0];
    if (!activeRoute) throw new Error("route_unavailable");
    const trustedContext = { activeRoute, selectedPathwayId: body.selectedPathwayId, selectedDestinationIds: ["berkeley", "ucla", "ucsd"] };

    if (body.mode === "seeded") {
      const interpretation = parseSeededPlanCommand(body.command, trustedContext);
      logSanitizedRequest({ requestId, endpoint: "command", mode, outcome: "complete", durationMs: Date.now() - startedAt });
      return jsonWithRequestId(interpretation, requestId);
    }

    lease = beginLiveRequest(request, "command", requestId);
    try {
      const interpretation = await academicAIProvider.parsePlanCommand(
        body.command,
        body.selectedPathwayId,
        activeRoute,
        { constraints, selectedDestinationIds: trustedContext.selectedDestinationIds },
        lease.context,
      );
      logSanitizedRequest({ requestId, endpoint: "command", mode, outcome: "complete", durationMs: Date.now() - startedAt });
      return jsonWithRequestId(interpretation, requestId);
    } catch (error) {
      if (!(error instanceof AIConfigurationError) && !(error instanceof AIWorkflowError)) throw error;
      const fallback = parseSeededPlanCommand(body.command, trustedContext);
      const category = error instanceof AIWorkflowError ? error.category : "unavailable";
      logSanitizedRequest({ requestId, endpoint: "command", mode, outcome: "fallback", category, durationMs: Date.now() - startedAt });
      return jsonWithRequestId(fallback, requestId, { headers: { "X-Waylo-Fallback": category } });
    }
  } catch (error) {
    const known = error instanceof LiveDemoError || error instanceof RequestSafetyError;
    const status = known ? error.status : 400;
    const code = known ? error.code : "invalid_request";
    logSanitizedRequest({ requestId, endpoint: "command", mode, outcome: "rejected", category: code, durationMs: Date.now() - startedAt });
    return jsonWithRequestId({ error: code, message: known ? error.message : "The planning request could not be normalized.", seededModeAvailable: true }, requestId, { status });
  } finally {
    lease?.release();
  }
}
