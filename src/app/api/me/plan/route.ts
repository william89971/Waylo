import { PlanActionSchema } from "@/lib/production-types";
import { ApiError, apiFailure } from "@/lib/server/api-errors";
import { parseJson } from "@/lib/server/api-request";
import { requireAuthenticatedUserId } from "@/lib/server/auth";
import { generateProductionPlan, productionEvidenceState, UCSD_DATA_RELEASE, WAYLO_ALGORITHM_VERSION } from "@/lib/server/production-planning";
import { studentRepository } from "@/lib/server/student-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clerkUserId = await requireAuthenticatedUserId();
    const workspace = await studentRepository.load(clerkUserId);
    return Response.json({ plan: workspace.activePlan ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const clerkUserId = await requireAuthenticatedUserId();
    const input = await parseJson(request, PlanActionSchema);
    const workspace = await studentRepository.load(clerkUserId);
    if (!workspace.profile.onboardingCompleted) throw new ApiError("onboarding_incomplete", "Complete onboarding before generating a plan.", 409);
    const result = generateProductionPlan(workspace);
    if (!result.routes.length) throw new ApiError("no_valid_plan", "Waylo could not build a valid route from the confirmed courses.", 409);
    if (input.action === "generate") {
      return Response.json({ proposal: result, evidenceState: productionEvidenceState(), academicDataVersion: UCSD_DATA_RELEASE }, { headers: { "Cache-Control": "no-store" } });
    }
    const route = result.routes.find((candidate) => candidate.strategy === input.strategy);
    if (!route) throw new ApiError("strategy_unavailable", "That plan strategy is no longer available.", 409);
    const saved = await studentRepository.savePlan(clerkUserId, route, WAYLO_ALGORITHM_VERSION, UCSD_DATA_RELEASE, productionEvidenceState());
    return Response.json({ plan: saved }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiFailure(error);
  }
}
