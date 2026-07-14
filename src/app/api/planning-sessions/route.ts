import { z } from "zod";
import { academicAIProvider } from "@/lib/ai/provider";
import { OperationalTraceEventSchema, PlanResultSchema, StudentProfileSchema, type OperationalTraceEvent } from "@/lib/domain";
import { createOperationalTrace } from "@/lib/planning-events";

export const runtime = "nodejs";

const RequestSchema = z.object({ mode: z.enum(["seeded", "live"]).default("seeded"), profile: StudentProfileSchema, plan: PlanResultSchema });
const encoder = new TextEncoder();

export async function POST(request: Request) {
  let body: z.infer<typeof RequestSchema>;
  try { body = RequestSchema.parse(await request.json()); }
  catch { return Response.json({ error: "invalid_request", message: "A validated profile and plan are required." }, { status: 400 }); }

  const events = createOperationalTrace(body.plan);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: OperationalTraceEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(OperationalTraceEventSchema.parse(event))}\n`));
      try {
        for (const event of events) send(event);
        if (body.mode === "live") {
          if (!academicAIProvider.isConfigured()) {
            send({ id: "event-live-missing", stage: "review", label: "Live explanation unavailable", detail: "OPENAI_API_KEY is not configured. The validated seeded route remains available.", status: "review", evidenceIds: [] });
          } else {
            await academicAIProvider.explainPlanningSession(body.profile, body.plan);
            send({ id: "event-live-complete", stage: "route", label: "Live GPT-5.6 explanation complete", detail: "The model used read-only planning tools; the displayed route still comes from deterministic validation.", status: "complete", evidenceIds: [] });
          }
        }
      } catch {
        send({ id: "event-live-failed", stage: "review", label: "Live explanation could not finish", detail: "Waylo kept the deterministic route and returned to seeded explanation mode.", status: "review", evidenceIds: [] });
      } finally { controller.close(); }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
