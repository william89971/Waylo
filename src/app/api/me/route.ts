import { z } from "zod";
import { OnboardingProfileSchema, PlanningPreferencesInputSchema } from "@/lib/production-types";
import { apiFailure } from "@/lib/server/api-errors";
import { parseJson } from "@/lib/server/api-request";
import { requireAuthenticatedUserId } from "@/lib/server/auth";
import { studentRepository } from "@/lib/server/student-repository";

export const dynamic = "force-dynamic";

const UpdateSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("profile"), profile: OnboardingProfileSchema }),
  z.object({ section: z.literal("preferences"), preferences: PlanningPreferencesInputSchema }),
]);

export async function GET() {
  try {
    const clerkUserId = await requireAuthenticatedUserId();
    return Response.json({ workspace: await studentRepository.load(clerkUserId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const clerkUserId = await requireAuthenticatedUserId();
    const input = await parseJson(request, UpdateSchema);
    const workspace = input.section === "profile"
      ? await studentRepository.updateProfile(clerkUserId, input.profile)
      : await studentRepository.updatePreferences(clerkUserId, input.preferences);
    return Response.json({ workspace }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiFailure(error);
  }
}
