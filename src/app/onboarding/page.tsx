import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { courses } from "@/lib/academic-data";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { listSelectableTargets } from "@/lib/server/production-planning";
import { studentRepository } from "@/lib/server/student-repository";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const clerkUserId = await getAuthenticatedUserId();
  if (!clerkUserId) redirect("/sign-up");
  const workspace = await studentRepository.load(clerkUserId);
  if (workspace.profile.onboardingCompleted && workspace.activePlan) redirect("/app");
  return (
    <OnboardingFlow initial={workspace} catalog={courses} targets={await listSelectableTargets()} />
  );
}
