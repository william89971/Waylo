import { expandLabPairCourseCodes } from "@/lib/articulation/multi-target-plan";
import { loadActiveArticulationGraph } from "@/lib/articulation/load-graph";
import { PlanActionSchema } from "@/lib/production-types";
import { ApiError, apiFailure } from "@/lib/server/api-errors";
import { parseJson } from "@/lib/server/api-request";
import { requireAuthenticatedUserId } from "@/lib/server/auth";
import { normalizePlanCourseCode } from "@/lib/next-term-blocks";
import {
  generateMultiTargetProductionPlan,
  generateProductionPlan,
  MULTI_TARGET_DATA_RELEASE,
  productionEvidenceState,
  shouldUseLegacyUcsdPlanner,
  UCSD_DATA_RELEASE,
  WAYLO_ALGORITHM_VERSION,
} from "@/lib/server/production-planning";
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
    let workspace = await studentRepository.load(clerkUserId);
    if (!workspace.profile.onboardingCompleted) {
      throw new ApiError("onboarding_incomplete", "Complete onboarding before generating a plan.", 409);
    }

    if (!shouldUseLegacyUcsdPlanner(workspace)) {
      if (input.action === "choose_route") {
        await studentRepository.updatePreferences(clerkUserId, {
          maxUnits: input.maxUnits,
          summerEnrollment: input.summerEnrollment,
          weeklyWorkHours: workspace.preferences.weeklyWorkHours,
          targetTerm: workspace.preferences.targetTerm,
        });
        await studentRepository.updateTargets(clerkUserId, {
          primaryTargetId: workspace.primaryTargetId,
          secondaryTargetIds: workspace.secondaryTargetIds ?? [],
          includeSecondaryDivergence: input.includeSecondaryDivergence,
        });
        workspace = await studentRepository.load(clerkUserId);
      }
      if (input.action === "block_next_term" || input.action === "unblock_next_term") {
        const code = normalizePlanCourseCode(input.code);
        const graph = await loadActiveArticulationGraph();
        const paired = expandLabPairCourseCodes([code], graph);
        if (input.action === "block_next_term") {
          const current = await generateMultiTargetProductionPlan(workspace);
          const firstCodes = (current.schedule.terms[0]?.courses ?? []).map((course) =>
            normalizePlanCourseCode(course.code),
          );
          if (!workspace.blockedNextTermCodes.includes(code) && !firstCodes.includes(code)) {
            throw new ApiError("not_next_term", "That class is not on next semester.", 409);
          }
          await studentRepository.updateBlockedNextTermCodes(clerkUserId, [
            ...workspace.blockedNextTermCodes,
            ...paired,
          ]);
        } else {
          const remove = new Set(paired);
          await studentRepository.updateBlockedNextTermCodes(
            clerkUserId,
            workspace.blockedNextTermCodes.filter((item) => !remove.has(item)),
          );
        }
        workspace = await studentRepository.load(clerkUserId);
      }
      const multi = await generateMultiTargetProductionPlan(workspace);
      if (input.action === "generate") {
        return Response.json(
          {
            proposal: multi,
            mode: "multi_target",
            evidenceState: productionEvidenceState(),
            academicDataVersion: MULTI_TARGET_DATA_RELEASE,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      const saved = await studentRepository.saveMultiTargetPlan(
        clerkUserId,
        multi,
        WAYLO_ALGORITHM_VERSION,
        MULTI_TARGET_DATA_RELEASE,
        productionEvidenceState(),
      );
      return Response.json({ plan: saved }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }

    const result = generateProductionPlan(workspace);
    if (!result.routes.length) {
      throw new ApiError("no_valid_plan", "Waylo could not build a valid route from the confirmed courses.", 409);
    }
    if (input.action === "generate") {
      return Response.json(
        {
          proposal: result,
          mode: "legacy_ucsd",
          evidenceState: productionEvidenceState(),
          academicDataVersion: UCSD_DATA_RELEASE,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (
      input.action === "choose_route" ||
      input.action === "block_next_term" ||
      input.action === "unblock_next_term"
    ) {
      throw new ApiError("strategy_unavailable", "Route choices are not available on this planner.", 409);
    }
    const route = result.routes.find((candidate) => candidate.strategy === input.strategy);
    if (!route) throw new ApiError("strategy_unavailable", "That plan strategy is no longer available.", 409);
    const saved = await studentRepository.savePlan(
      clerkUserId,
      route,
      WAYLO_ALGORITHM_VERSION,
      UCSD_DATA_RELEASE,
      productionEvidenceState(),
    );
    return Response.json({ plan: saved }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiFailure(error);
  }
}
