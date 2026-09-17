import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { productionStudentCatalog } from "@/lib/articulation/student-catalog";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { listSelectableTargets } from "@/lib/server/production-planning";
import { studentRepository } from "@/lib/server/student-repository";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const clerkUserId = await getAuthenticatedUserId();
  if (!clerkUserId) redirect("/sign-up");
  const workspace = await studentRepository.load(clerkUserId);
  const editing = (await searchParams).edit === "1";
  if (workspace.profile.onboardingCompleted && workspace.activePlan && !editing) redirect("/app");
  return (
    <OnboardingFlow
      initial={workspace}
      catalog={productionStudentCatalog()}
      targets={await listSelectableTargets()}
      startStep={editing ? 3 : undefined}
      editing={editing}
    />
  );
}
