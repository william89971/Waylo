import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, LockKeyhole } from "lucide-react";
import { EvidenceStatus } from "@/components/evidence-status";
import { SavePlanButton } from "@/components/save-plan-button";
import { evidenceById, programById } from "@/lib/academic-data";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { generateProductionPlan, productionEvidenceState, UCSD_DATA_RELEASE } from "@/lib/server/production-planning";
import { studentRepository } from "@/lib/server/student-repository";

export const dynamic = "force-dynamic";

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const clerkUserId = await getAuthenticatedUserId();
  if (!clerkUserId) redirect("/sign-in");
  const workspace = await studentRepository.load(clerkUserId);
  if (!workspace.profile.onboardingCompleted) redirect("/onboarding");
  const showProposal = (await searchParams).new === "1" || !workspace.activePlan;
  const result = generateProductionPlan(workspace);
  const route = showProposal ? result.routes[0] : workspace.activePlan?.route ?? result.routes[0];
  if (!route) return <div className="production-page"><h1>We need more information</h1><p>Waylo could not build a valid route from the confirmed courses.</p><Link href="/onboarding" className="production-button primary">Review your courses</Link></div>;
  const program = programById.get("ucsd-data");
  return (
    <div className="production-page plan-page">
      <header className="production-page-header"><h1>{showProposal ? "Review your transfer plan" : "Your transfer plan"}</h1><p>{program?.universityName} {program?.name} {program?.degree} · {route.label}</p></header>
      {showProposal ? <div className="proposal-banner"><LockKeyhole /><div><strong>Proposed — not saved</strong><span>Review the semester sequence and evidence before saving this plan.</span></div></div> : null}
      {productionEvidenceState() === "needs_review" ? <div className="review-banner"><AlertTriangle /><div><strong>This plan contains articulation items that need confirmation.</strong><span>You can save it as a planning route, but it is not an official degree audit or verified articulation agreement.</span></div><Link href="/app/evidence">Review evidence</Link></div> : null}
      <section className="semester-timeline" aria-label="Semester-by-semester plan">
        {route.terms.map((term) => <article className="semester-column" key={term.id}><header><strong>{term.label}</strong><span>{term.totalUnits} units planned</span></header><div>{term.courses.map((course) => {
          const needsReview = course.evidenceIds.some((id) => evidenceById.get(id)?.status !== "verified");
          return <section className={`plan-course ${needsReview ? "needs-review" : ""}`} key={course.courseId}><strong>{course.code}</strong><span>{course.title}</span><small>{course.units} units</small><EvidenceStatus state={needsReview ? "review" : "suggestion"} /><Link href={`/app/evidence?course=${course.courseId}`}>View source <ArrowRight /></Link></section>;
        })}</div></article>)}
      </section>
      <div className="plan-footer"><div><strong>Estimated transfer</strong><span>{route.estimatedTransferTerm}</span><small>Academic data: {UCSD_DATA_RELEASE}</small></div>{showProposal ? <SavePlanButton strategy={route.strategy} /> : <Link href="/app/plan?new=1" className="production-button">Generate a fresh proposal</Link>}</div>
      <section id="what-if" className="what-if-placeholder"><h2>If your schedule changes</h2><p>The protected what-if workflow will preview timing and downstream course changes without overwriting this saved plan.</p><button className="production-button" disabled>What-if planning arrives after Preview validation</button></section>
    </div>
  );
}
