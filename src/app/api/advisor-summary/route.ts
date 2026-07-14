import { z } from "zod";
import { academicAIProvider, AIConfigurationError, AIWorkflowError } from "@/lib/ai/provider";
import { buildAdvisorDecisionPacket } from "@/lib/advisor-summary";
import { AcademicConstraintSchema, EvidenceReviewResolutionSchema, PlanResultSchema, SimulationDeltaSchema, StudentProfileSchema } from "@/lib/domain";

export const runtime = "nodejs";

const RequestSchema = z.object({
  mode: z.enum(["seeded", "live"]).default("seeded"),
  profile: StudentProfileSchema,
  plan: PlanResultSchema,
  constraints: AcademicConstraintSchema.optional(),
  reviewResolutions: z.array(EvidenceReviewResolutionSchema).default([]),
  simulation: SimulationDeltaSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const body = RequestSchema.parse(await request.json());
    if (body.mode === "live") await academicAIProvider.explainPlanningSession(body.profile, body.plan);
    const packet = buildAdvisorDecisionPacket(body.profile, body.plan, body.reviewResolutions, body.constraints, body.simulation);
    return Response.json({ mode: body.mode, packet });
  } catch (error) {
    if (error instanceof AIConfigurationError) return Response.json({ error: "missing_key", message: error.message, seededModeAvailable: true }, { status: 503 });
    if (error instanceof AIWorkflowError) return Response.json({ error: error.category, message: error.message, seededModeAvailable: true }, { status: 502 });
    return Response.json({ error: "invalid_request", message: "The advisor summary requires valid normalized workspace state." }, { status: 400 });
  }
}
