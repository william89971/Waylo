import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, FileCheck2 } from "lucide-react";
import { EvidenceStatus } from "@/components/evidence-status";
import { evidenceById, programById } from "@/lib/academic-data";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { studentRepository } from "@/lib/server/student-repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const clerkUserId = await getAuthenticatedUserId();
  if (!clerkUserId) redirect("/sign-in");
  const workspace = await studentRepository.load(clerkUserId);
  if (!workspace.profile.onboardingCompleted) redirect("/onboarding");
  const plan = workspace.activePlan;
  if (!plan) redirect("/app/plan?new=1");
  const route = plan.route;
  const nextTerm = route.terms[0];
  const program = programById.get("ucsd-data");
  const sourceIds = [...new Set(nextTerm?.courses.flatMap((course) => course.evidenceIds) ?? [])];
  const reviewCount = sourceIds.filter((id) => evidenceById.get(id)?.status !== "verified").length;
  const saved = (await searchParams).saved === "1";
  return (
    <div className="production-page dashboard-page fade-in">
      {saved ? <div className="success-banner"><FileCheck2 />Your plan is saved. It will be here when you return.</div> : null}
      <header className="production-page-header">
        <h1>What to take next semester</h1>
        <p>{nextTerm?.label ?? "Next term"} · {program?.universityName} {program?.name} {program?.degree}</p>
      </header>
      <div className="dashboard-layout">
        <section className="recommended-semester">
          <div className="section-heading"><div><h2>Recommended semester</h2><p>{route.label} · deterministic prerequisite validation complete</p></div></div>
          <div className="course-table" role="table" aria-label="Recommended semester courses">
            {nextTerm?.courses.map((course, index) => {
              const needsReview = course.evidenceIds.some((id) => evidenceById.get(id)?.status !== "verified");
              return <div className="course-row" role="row" key={course.courseId}><span className="drag-handle" aria-hidden="true">⠿</span><div className="course-identity"><strong>{course.code}</strong><small>{course.title} · {course.units} units</small></div><EvidenceStatus state={needsReview ? "review" : index === 0 ? "verified" : "suggestion"} /><Link href={`/app/evidence?course=${course.courseId}`}>View source</Link></div>;
            })}
            <div className="course-total"><span>Total</span><strong>{nextTerm?.totalUnits ?? 0} planned units</strong></div>
          </div>
          <div className="dashboard-actions"><Link href="/app/plan" className="production-button primary">Review semester plan</Link><Link href="/app/plan" className="production-button">Open roadmap</Link></div>
          <div className="what-if-row"><div><strong>Something changed?</strong><p>Explore how adding, dropping, or switching a course affects your plan and transfer timing.</p></div><Link href="/app/plan#what-if" className="production-button">Explore a what-if</Link></div>
        </section>
        <aside className="dashboard-rail">
          <section><h2>Why these courses</h2><p>They move you forward through the reviewed UCSD Data Science preparation sequence while respecting your unit limit.</p><Link href="/app/requirements">See how we decided</Link></section>
          <section><strong>{Math.max(0, 5 - workspace.courses.filter((course) => course.status === "completed").length)} of 5</strong><span>preparation areas remaining</span></section>
          <section><strong>{route.estimatedTransferTerm}</strong><span>estimated transfer</span></section>
          <section className={reviewCount ? "rail-review" : ""}><strong>{reviewCount}</strong><span>articulation {reviewCount === 1 ? "item" : "items"} need confirmation</span><Link href="/app/evidence">View items</Link></section>
        </aside>
      </div>
      <div className="mobile-primary-action"><Link href="/app/plan" className="production-button primary">Review semester plan <ArrowRight /></Link></div>
      <p className="saved-meta"><CalendarClock />Saved plan version {plan.version} · academic data {plan.academicDataVersion}</p>
    </div>
  );
}
