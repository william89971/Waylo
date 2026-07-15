import { z } from "zod";
import { academicAIProvider } from "@/lib/ai/provider";
import { beginLiveRequest, LiveDemoError, type LiveRequestLease } from "@/lib/ai/live-demo";
import { constraintsFromProfile } from "@/lib/academic-twin";
import { programs, seedProfile } from "@/lib/academic-data";
import { OperationalTraceEventSchema, type OperationalTraceEvent } from "@/lib/domain";
import { createOperationalTrace } from "@/lib/planning-events";
import { planningEngine } from "@/lib/planning-engine";
import { createRequestId, jsonWithRequestId, logSanitizedRequest, readLimitedJson, RequestSafetyError } from "@/lib/server/request-safety";

export const runtime = "nodejs";

const RequestSchema = z.object({
  mode: z.enum(["seeded", "live"]).default("seeded"),
  pathwayId: z.string().optional(),
  activeRouteId: z.string().optional(),
}).strict();
const encoder = new TextEncoder();

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let lease: LiveRequestLease | undefined;
  let mode: "seeded" | "live" = "seeded";
  try {
    const body = await readLimitedJson(request, RequestSchema);
    mode = body.mode;
    const pathwayId = programs.some((program) => program.id === body.pathwayId) ? body.pathwayId! : seedProfile.selectedPathwayId;
    const profile = { ...seedProfile, selectedPathwayId: pathwayId };
    const constraints = constraintsFromProfile(profile);
    const plan = planningEngine.buildPlan(profile, pathwayId, {
      includeSummer: constraints.summerEnrollment,
      summerCourseLimit: constraints.summerCourseLimit,
      maxUnits: constraints.maxUnits,
      weeklyWorkHours: constraints.weeklyWorkHours,
    });
    if (body.activeRouteId && !plan.routes.some((route) => route.id === body.activeRouteId)) throw new Error("route_unavailable");
    if (mode === "live") lease = beginLiveRequest(request, "planning", requestId);

    const events = createOperationalTrace(plan);
    const activeLease = lease;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: OperationalTraceEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(OperationalTraceEventSchema.parse(event))}\n`));
        let outcome: "complete" | "fallback" = "complete";
        let category: string | undefined;
        try {
          for (const event of events) send(event);
          if (mode === "live") {
            try {
              await academicAIProvider.explainPlanningSession(profile, plan, activeLease!.context);
              send({ id: "event-live-complete", stage: "route", label: "Live GPT-5.6 explanation complete", detail: "The model used read-only planning tools; the displayed route still comes from deterministic validation.", status: "complete", evidenceIds: [] });
            } catch (error) {
              outcome = "fallback";
              category = error instanceof Error ? error.name : "live_failure";
              send({ id: "event-live-fallback", stage: "review", label: "Continued in recorded mode", detail: "The live explanation was unavailable, so Waylo kept the deterministic route and its sanitized recorded trace.", status: "review", evidenceIds: [] });
            }
          }
          logSanitizedRequest({ requestId, endpoint: "planning", mode, outcome, category, durationMs: Date.now() - startedAt });
        } finally {
          activeLease?.release();
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Waylo-Request-Id": requestId } });
  } catch (error) {
    lease?.release();
    const known = error instanceof LiveDemoError || error instanceof RequestSafetyError;
    const status = known ? error.status : 400;
    const code = known ? error.code : "invalid_request";
    logSanitizedRequest({ requestId, endpoint: "planning", mode, outcome: "rejected", category: code, durationMs: Date.now() - startedAt });
    return jsonWithRequestId({ error: code, message: known ? error.message : "The approved planning workflow could not be started.", seededModeAvailable: true }, requestId, { status });
  }
}
