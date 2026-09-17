import Link from "next/link";
import { redirect } from "next/navigation";
import { EvidenceStatus } from "@/components/evidence-status";
import { evidenceById } from "@/lib/academic-data";
import { buildAdmissionsStrategy } from "@/lib/admissions-strategy";
import type { VerificationTier } from "@/lib/articulation/types";
import type { SavedPlan, SelectableTarget } from "@/lib/production-types";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { listSelectableTargets } from "@/lib/server/production-planning";
import { studentRepository } from "@/lib/server/student-repository";
import { courseCountsLine, formatSelectableTargetLabel } from "@/lib/student-facing-copy";

export const dynamic = "force-dynamic";

function labelFor(targets: SelectableTarget[], id: string) {
  return formatSelectableTargetLabel(targets, id);
}

function scheduledFor(
  course: SavedPlan["route"]["terms"][number]["courses"][number],
  plan: SavedPlan,
) {
  return plan.multiTargetPlan?.schedule.terms
    .flatMap((term) => term.courses)
    .find((item) => item.courseId === course.courseId || item.code === course.code);
}

function courseEvidenceState(
  course: SavedPlan["route"]["terms"][number]["courses"][number],
  plan: SavedPlan,
): "verified" | "suggestion" | "review" {
  const scheduled = scheduledFor(course, plan);
  if (scheduled) {
    const tier: VerificationTier = scheduled.verificationTier;
    if (tier === "VERIFIED_ASSIST" || tier === "VERIFIED_INSTITUTIONAL_GUIDE") return "verified";
    if (tier === "NEEDS_COUNSELOR_CONFIRMATION") return "review";
    return "suggestion";
  }
  if (!course.evidenceIds.length) return "suggestion";
  return course.evidenceIds.some((id) => evidenceById.get(id)?.status !== "verified") ? "review" : "verified";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const clerkUserId = await getAuthenticatedUserId();
  if (!clerkUserId) redirect("/sign-in");
  const workspace = await studentRepository.load(clerkUserId);
  if (!workspace.profile.onboardingCompleted) redirect("/onboarding");
  const plan = workspace.activePlan;
  if (!plan) redirect("/app/plan?new=1");
  const route = plan.route;
  const nextTerm = route.terms[0];
  const targets = await listSelectableTargets();
  const primaryId = plan.primaryTargetId ?? workspace.primaryTargetId;
  const secondaryIds = plan.secondaryTargetIds ?? workspace.secondaryTargetIds ?? [];
  const primaryLabel = labelFor(targets, primaryId);
  const secondaryLabels = secondaryIds.map((id) => labelFor(targets, id));
  const sourceIds = [...new Set(route.terms.flatMap((term) => term.courses.flatMap((course) => course.evidenceIds)))];
  const reviewCount = plan.multiTargetPlan
    ? plan.multiTargetPlan.auditSummary.reduce(
        (count, audit) =>
          count +
          audit.requirementStates.filter(
            (requirement) =>
              !requirement.satisfied || requirement.verificationTier === "NEEDS_COUNSELOR_CONFIRMATION",
          ).length,
        0,
      )
    : sourceIds.filter((id) => evidenceById.get(id)?.status !== "verified").length;
  const completedCount = workspace.courses.filter((course) => course.status === "completed").length;
  const strategy = buildAdmissionsStrategy(workspace, targets, {
    hasValidPlan: true,
    plannedCourseCodes: route.terms.flatMap((term) => term.courses.map((course) => course.code)),
    reviewItemCount: reviewCount,
  });
  const saved = (await searchParams).saved === "1";
  const whyHref = plan.multiTargetPlan ? "/app/plan" : "/app/evidence";
  const askCounselor = strategy?.counselor.items[0];

  return (
    <div className="production-page dashboard-page">
      {saved ? (
        <div className="success-banner" role="status">
          Plan saved. You can come back to this list anytime.
        </div>
      ) : null}
      <header className="production-page-header">
        <h1>What to take next semester</h1>
        <p>
          {nextTerm?.label ?? "Next term"} · {primaryLabel}
          {secondaryLabels.length ? ` · Also planning: ${secondaryLabels.join(", ")}` : ""}
        </p>
      </header>
      <div className="dashboard-layout">
        <section className="recommended-semester">
          <div className="section-heading">
            <div>
              <h2>Recommended semester</h2>
              <p>The next classes that move your transfer plan forward without going over your unit limit.</p>
            </div>
          </div>
          <div className="course-table" role="table" aria-label="Recommended semester courses">
            {nextTerm?.courses.map((course) => {
              const state = courseEvidenceState(course, plan);
              const scheduled = scheduledFor(course, plan);
              const schoolLabels = scheduled
                ? scheduled.fulfillsTargetIds.map((id) => labelFor(targets, id))
                : [primaryLabel];
              const whyLink = scheduled
                ? `/app/plan?course=${encodeURIComponent(scheduled.code)}`
                : `/app/evidence?course=${encodeURIComponent(course.courseId)}`;
              return (
                <div className="course-row" role="row" key={course.courseId}>
                  <div className="course-identity">
                    <strong>{course.code}</strong>
                    <small>
                      {course.title} · {course.units} units
                    </small>
                    <small>{courseCountsLine(schoolLabels)}</small>
                  </div>
                  <EvidenceStatus state={state} tier={scheduled?.verificationTier} />
                  <Link href={whyLink}>Why this class</Link>
                </div>
              );
            })}
            <div className="course-total">
              <span>Total</span>
              <strong>{nextTerm?.totalUnits ?? 0} planned units</strong>
            </div>
          </div>
          <div className="dashboard-actions">
            <Link href="/app/plan" className="production-button primary">
              Review semester plan
            </Link>
            <Link href="/app/plan#counselor-packet" className="production-button">
              Take this to your counselor
            </Link>
          </div>
        </section>
        <aside className="dashboard-rail">
          <section>
            <h2>Why these courses</h2>
            <p>
              They are the next required prep for {primaryLabel}
              {secondaryLabels.length ? `, while keeping ${secondaryLabels.join(" and ")} in view` : ""}. They stay
              inside your unit limit.
            </p>
            <Link href={whyHref}>See how we decided</Link>
          </section>
          {reviewCount > 0 ? (
            <section className="rail-review">
              <strong>{reviewCount}</strong>
              <span>
                {reviewCount === 1 ? "item still needs a counselor" : "items still need a counselor"} before you
                enroll
              </span>
              <p>{askCounselor ?? "Ask a counselor to confirm anything Waylo could not verify."}</p>
              <Link href="/app/plan#counselor-packet">What to ask</Link>
            </section>
          ) : (
            <section>
              <strong>Ready to confirm</strong>
              <span>Bring this list to a counselor before you enroll. Waylo is not an official degree audit.</span>
            </section>
          )}
          {strategy ? (
            <section className="strategy-teaser">
              <h2>Admissions strategy</h2>
              <p>{strategy.teaser}</p>
              <Link href="/app/plan#admissions-strategy">Read the strategy note</Link>
            </section>
          ) : null}
          <section>
            <strong>{completedCount}</strong>
            <span>
              confirmed College of the Canyons {completedCount === 1 ? "class" : "classes"}
            </span>
          </section>
          <section>
            <strong>{route.estimatedTransferTerm}</strong>
            <span>estimated transfer</span>
          </section>
        </aside>
      </div>
      <p className="saved-meta">
        Saved plan version {plan.version} · academic data {plan.academicDataVersion}
      </p>
    </div>
  );
}
