import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock } from "lucide-react";
import { EvidenceStatus } from "@/components/evidence-status";
import { evidenceById } from "@/lib/academic-data";
import { buildAdmissionsStrategy } from "@/lib/admissions-strategy";
import type { VerificationTier } from "@/lib/articulation/types";
import type { SavedPlan, SelectableTarget } from "@/lib/production-types";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { listSelectableTargets } from "@/lib/server/production-planning";
import { studentRepository } from "@/lib/server/student-repository";

export const dynamic = "force-dynamic";

function labelFor(targets: SelectableTarget[], id: string) {
  const target = targets.find((item) => item.id === id);
  return target ? `${target.institutionName} ${target.displayName}` : id;
}

function courseEvidenceState(
  course: SavedPlan["route"]["terms"][number]["courses"][number],
  plan: SavedPlan,
): "verified" | "suggestion" | "review" {
  const scheduled = plan.multiTargetPlan?.schedule.terms
    .flatMap((term) => term.courses)
    .find((item) => item.courseId === course.courseId || item.code === course.code);
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

  return (
    <div className="production-page dashboard-page">
      {saved ? (
        <div className="success-banner" role="status">
          Plan saved.
        </div>
      ) : null}
      <header className="production-page-header">
        <h1>What to take next semester</h1>
        <p>
          {nextTerm?.label ?? "Next term"} · {primaryLabel}
          {secondaryLabels.length ? ` · Secondary: ${secondaryLabels.join(", ")}` : ""}
        </p>
      </header>
      <div className="dashboard-layout">
        <section className="recommended-semester">
          <div className="section-heading">
            <div>
              <h2>Recommended semester</h2>
              <p>
                {route.label} · checked against prerequisites and your unit limit
              </p>
            </div>
          </div>
          <div className="course-table" role="table" aria-label="Recommended semester courses">
            {nextTerm?.courses.map((course) => {
              const state = courseEvidenceState(course, plan);
              return (
                <div className="course-row" role="row" key={course.courseId}>
                  <div className="course-identity">
                    <strong>{course.code}</strong>
                    <small>
                      {course.title} · {course.units} units
                    </small>
                  </div>
                  <EvidenceStatus state={state} />
                  <Link href={`/app/evidence?course=${course.courseId}`}>View source</Link>
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
            <Link href="/app/plan" className="production-text-link">
              See all semesters
            </Link>
          </div>
        </section>
        <aside className="dashboard-rail">
          <section>
            <h2>Why these courses</h2>
            <p>
              They continue the {primaryLabel} prep sequence while staying inside your unit limit.
            </p>
            <Link href="/app/requirements">See how we decided</Link>
          </section>
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
              confirmed College of the Canyons {completedCount === 1 ? "course" : "courses"}
            </span>
          </section>
          <section>
            <strong>{route.estimatedTransferTerm}</strong>
            <span>estimated transfer</span>
          </section>
          <section className={reviewCount ? "rail-review" : ""}>
            <strong>{reviewCount}</strong>
            <span>
              articulation {reviewCount === 1 ? "item" : "items"} need confirmation
            </span>
            <Link href="/app/evidence">View items</Link>
          </section>
        </aside>
      </div>
      <div className="mobile-primary-action">
        <Link href="/app/plan" className="production-button primary">
          Review semester plan <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <p className="saved-meta">
        <CalendarClock aria-hidden="true" />
        Saved plan version {plan.version} · academic data {plan.academicDataVersion}
      </p>
    </div>
  );
}
