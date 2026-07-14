import { z } from "zod";
import { academicAIProvider, AIConfigurationError, AIWorkflowError } from "@/lib/ai/provider";
import { planningEngine } from "@/lib/planning-engine";
import { seedProfile } from "@/lib/academic-data";
import { parseSeededPlanCommand } from "@/lib/plan-command";

export const runtime = "nodejs";

const RequestSchema = z.object({
  mode: z.enum(["seeded", "live"]).default("seeded"),
  command: z.string().trim().min(1).max(500),
  selectedPathwayId: z.string(),
  activeRouteId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = RequestSchema.parse(await request.json());
    if (body.mode === "seeded") return Response.json(parseSeededPlanCommand(body.command));
    const plan = planningEngine.buildPlan({ ...seedProfile, selectedPathwayId: body.selectedPathwayId }, body.selectedPathwayId);
    const activeRoute = plan.routes.find((route) => route.id === body.activeRouteId) ?? plan.routes[0];
    return Response.json(await academicAIProvider.parsePlanCommand(body.command, body.selectedPathwayId, activeRoute));
  } catch (error) {
    if (error instanceof AIConfigurationError) return Response.json({ error: "missing_key", message: error.message, seededModeAvailable: true }, { status: 503 });
    if (error instanceof AIWorkflowError) return Response.json({ error: error.category, message: error.message, seededModeAvailable: true }, { status: error.category === "rate_limit" ? 429 : 502 });
    return Response.json({ error: "invalid_request", message: "The planning request could not be normalized." }, { status: 400 });
  }
}
