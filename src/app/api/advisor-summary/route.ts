import { z } from "zod";
import { academicAIProvider, AIConfigurationError, AIWorkflowError } from "@/lib/ai/provider";
import { buildAdvisorSummary } from "@/lib/advisor-summary";
import { PlanResultSchema, StudentProfileSchema } from "@/lib/domain";

export const runtime = "nodejs";

const RequestSchema = z.object({ mode: z.enum(["seeded", "live"]).default("seeded"), profile: StudentProfileSchema, plan: PlanResultSchema });

export async function POST(request: Request) {
  try {
    const body = RequestSchema.parse(await request.json());
    const summary = body.mode === "live" ? await academicAIProvider.createAdvisorSummary(body.profile, body.plan) : buildAdvisorSummary(body.profile, body.plan);
    return Response.json({ mode: body.mode, summary });
  } catch (error) {
    if (error instanceof AIConfigurationError) return Response.json({ error: "missing_key", message: error.message, seededModeAvailable: true }, { status: 503 });
    if (error instanceof AIWorkflowError) return Response.json({ error: error.category, message: error.message, seededModeAvailable: true }, { status: 502 });
    return Response.json({ error: "invalid_request", message: "The advisor summary requires valid normalized workspace state." }, { status: 400 });
  }
}
