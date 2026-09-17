import Link from "next/link";
import { redirect } from "next/navigation";
import { CalGetcPanel } from "@/components/cal-getc-panel";
import { CounselorConfirmationList } from "@/components/counselor-confirmation-list";
import type { CourseEvidencePayload } from "@/components/evidence-drawer";
import { HomeSemesterList, type HomeSemesterCourse } from "@/components/home-semester-list";
import { evidenceById } from "@/lib/academic-data";
import { buildAdmissionsStrategy } from "@/lib/admissions-strategy";
import { evaluateCalGetc } from "@/lib/articulation/cal-getc";
import { buildCounselorConfirmationItems } from "@/lib/articulation/counselor-confirmation";
import { loadActiveArticulationGraph } from "@/lib/articulation/load-graph";
import { buildEvidenceByCourseCode } from "@/lib/articulation/matrix-view";
import { pickRuleForCourse } from "@/lib/articulation/rules";
import { graphCodeForStudentCourse, unmatchedCompletedCourses } from "@/lib/articulation/student-history";
import type { ArticulationGraph, VerificationTier } from "@/lib/articulation/types";
import type { SavedPlan, SelectableTarget } from "@/lib/production-types";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { listSelectableTargets } from "@/lib/server/production-planning";
import { studentRepository } from "@/lib/server/student-repository";
import { alreadyDoneLine, courseCountsLine, courseWhySentence, formatSelectableTargetLabel } from "@/lib/student-facing-copy";

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

function whyThisClass(
  course: SavedPlan["route"]["terms"][number]["courses"][number],
  plan: SavedPlan,
  targets: SelectableTarget[],
  graph: ArticulationGraph | null,
  primaryLabel: string,
) {
  const scheduled = scheduledFor(course, plan);
  if (scheduled && graph) {
    const parts = scheduled.fulfillsTargetIds.map((id) => {
      const rule = pickRuleForCourse(graph.rulesByTargetMajorId.get(id) ?? [], scheduled.code);
      return { school: formatSelectableTargetLabel(targets, id), requirement: rule?.label };
    });
    return courseWhySentence(parts);
  }
  const schoolLabels = scheduled ? scheduled.fulfillsTargetIds.map((id) => formatSelectableTargetLabel(targets, id)) : [primaryLabel];
  return courseCountsLine(schoolLabels);
}

function primaryEvidenceTier(
  course: SavedPlan["route"]["terms"][number]["courses"][number],
  plan: SavedPlan,
  graph: ArticulationGraph | null,
  primaryId: string,
): VerificationTier | undefined {
  const scheduled = scheduledFor(course, plan);
  if (scheduled && graph) {
    const rule = pickRuleForCourse(graph.rulesByTargetMajorId.get(primaryId) ?? [], scheduled.code);
    return rule?.verificationTier ?? scheduled.verificationTier;
  }
  return scheduled?.verificationTier;
}

function courseEvidenceState(
  course: SavedPlan["route"]["terms"][number]["courses"][number],
  plan: SavedPlan,
  graph: ArticulationGraph | null,
  primaryId: string,
): "verified" | "suggestion" | "review" {
  const tier = primaryEvidenceTier(course, plan, graph, primaryId);
  if (tier) {
    if (tier === "VERIFIED_ASSIST" || tier === "VERIFIED_INSTITUTIONAL_GUIDE") return "verified";
    if (tier === "NEEDS_COUNSELOR_CONFIRMATION") return "review";
    return "suggestion";
  }
  if (!course.evidenceIds.length) return "suggestion";
  return course.evidenceIds.some((id) => evidenceById.get(id)?.status !== "verified") ? "review" : "verified";
}

function legacyEvidenceByCourse(
  course: SavedPlan["route"]["terms"][number]["courses"][number],
  primaryLabel: string,
): CourseEvidencePayload {
  const first = course.evidenceIds.map((id) => evidenceById.get(id)).find(Boolean);
  return {
    courseCode: course.code,
    courseTitle: course.title,
    semesterUnits: course.units,
    campuses: [
      {
        targetMajorId: "primary",
        campusLabel: primaryLabel,
        isPrimary: true,
        required: true,
        destinationRequirement: first?.title ?? course.title,
        verificationTier: first?.status === "verified" ? "VERIFIED_ASSIST" : "NEEDS_COUNSELOR_CONFIRMATION",
        sourceType: first?.provenance === "assist" ? "assist_public" : "institutional_guide",
        sourceUrl: first?.url,
        agreementYear: first?.effectiveYear,
        notes: first?.note,
      },
    ],
  };
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
  const [targets, graph] = await Promise.all([
    listSelectableTargets(),
    loadActiveArticulationGraph(),
  ]);
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
            (requirement) => requirement.verificationTier === "NEEDS_COUNSELOR_CONFIRMATION" && !requirement.historySatisfied,
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
  const alreadyDone = (plan.multiTargetPlan?.auditSummary ?? [])
    .map((audit) => {
      const labels = audit.requirementStates
        .filter((requirement) => requirement.historySatisfied)
        .map((requirement) => requirement.label)
        .slice(0, 3);
      return alreadyDoneLine(labelFor(targets, audit.targetMajorId), labels);
    })
    .filter(Boolean);
  const stillMissing = (plan.multiTargetPlan?.auditSummary ?? []).flatMap((audit) =>
    audit.requirementStates
      .filter((requirement) => !requirement.satisfied)
      .map((requirement) => {
        const school = labelFor(targets, audit.targetMajorId);
        if (requirement.verificationTier === "NEEDS_COUNSELOR_CONFIRMATION") {
          return `${requirement.label} at ${school} — ask a counselor. Waylo cannot verify this.`;
        }
        return `${requirement.label} at ${school} is still open.`;
      }),
  );
  const unmatched = unmatchedCompletedCourses(workspace.courses, graph);
  const inProgressCount = workspace.courses.filter((course) => course.status === "in_progress").length;
  const juniorStandingMet = plan.multiTargetPlan?.auditSummary.some((audit) => audit.juniorStandingMet) ?? false;
  const selectedTargets = targets.filter((target) => target.id === primaryId || secondaryIds.includes(target.id));
  const counselorItems = buildCounselorConfirmationItems({
    courses: workspace.courses,
    graph,
    plan: plan.multiTargetPlan,
    targets: selectedTargets,
  });
  const completedCodes = new Set(
    workspace.courses.flatMap((course) => {
      if (course.status !== "completed") return [];
      const code = graphCodeForStudentCourse(course, graph);
      return code ? [code] : [];
    }),
  );
  const calGetc = evaluateCalGetc(completedCodes);
  const evidenceByCourseCode = plan.multiTargetPlan
    ? buildEvidenceByCourseCode(plan.multiTargetPlan, graph)
    : Object.fromEntries((nextTerm?.courses ?? []).map((course) => [course.code, legacyEvidenceByCourse(course, primaryLabel)]));
  const nextCourses: HomeSemesterCourse[] = (nextTerm?.courses ?? []).map((course) => {
    const scheduled = scheduledFor(course, plan);
    const payload = evidenceByCourseCode[scheduled?.code ?? course.code];
    const sourceCampus = payload?.campuses.find((campus) => campus.required && campus.sourceUrl);
    return {
      courseId: course.courseId,
      code: course.code,
      title: course.title,
      units: course.units,
      why: whyThisClass(course, plan, targets, graph, primaryLabel),
      state: courseEvidenceState(course, plan, graph, primaryId),
      tier: primaryEvidenceTier(course, plan, graph, primaryId),
      sourceUrl: sourceCampus?.sourceUrl,
      sourceLabel: sourceCampus?.agreementYear ? `Official source · ${sourceCampus.agreementYear}` : "Official source",
    };
  });

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
              <p>The next classes that move every selected school forward, inside your unit limit.</p>
            </div>
          </div>
          <HomeSemesterList
            courses={nextCourses}
            totalUnits={nextTerm?.totalUnits ?? 0}
            evidenceByCourseCode={evidenceByCourseCode}
          />
          <div className="already-counted">
            <h2>Already finished</h2>
            {alreadyDone.length ? (
              <ul>
                {alreadyDone.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>
                {completedCount
                  ? "Your finished classes are saved. None of them close a listed major-prep requirement yet."
                  : "No finished classes yet. Add them under Your classes if you have already taken College of the Canyons courses."}
              </p>
            )}
            {unmatched.length ? (
              <p>
                Saved but not matched to a listed requirement:{" "}
                {unmatched.map((course) => `${course.code} ${course.title}`).join("; ")}. Ask a counselor whether
                those count.
              </p>
            ) : null}
          </div>
          {stillMissing.length ? (
            <div className="already-counted">
              <h2>Still missing after this plan</h2>
              <ul>
                {stillMissing.slice(0, 4).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <CalGetcPanel areas={calGetc} />
          <CounselorConfirmationList items={counselorItems} />
          <div className="dashboard-actions">
            <Link href="/app/plan#counselor-packet" className="production-button primary">
              Take this to your counselor
            </Link>
            <Link href="/app/plan" className="production-button">
              See all terms
            </Link>
          </div>
        </section>
        <aside className="dashboard-rail">
          {counselorItems.length ? (
            <section className="rail-review">
              <strong>{counselorItems.length}</strong>
              <span>
                {counselorItems.length === 1 ? "item needs counselor confirmation" : "items need counselor confirmation"}
              </span>
              <p>Unverified information is never treated as fact.</p>
              <a href="#counselor-confirm-title">See the list</a>
            </section>
          ) : (
            <section>
              <strong>Ready to confirm</strong>
              <span>Bring this list to a counselor before you enroll. Waylo is not an official degree audit.</span>
            </section>
          )}
          <section>
            <strong>{completedCount}</strong>
            <span>
              {completedCount === 1 ? "finished class on your record" : "finished classes on your record"}
              {inProgressCount ? ` · ${inProgressCount} in progress` : ""}
            </span>
            <Link href="/app/courses">Update your classes</Link>
          </section>
          {juniorStandingMet ? (
            <section>
              <strong>{route.estimatedTransferTerm}</strong>
              <span>earliest term this plan finishes listed major prep — not an admission date</span>
            </section>
          ) : (
            <section>
              <strong>Junior standing not met</strong>
              <span>
                This plan tracks major prep. It does not estimate a transfer term until unit minimums are actually met.
              </span>
            </section>
          )}
          {strategy ? (
            <section>
              <Link href="/app/plan#admissions-strategy">Read the strategy note</Link>
            </section>
          ) : null}
        </aside>
      </div>
      <p className="saved-meta">
        Saved plan version {plan.version}
      </p>
    </div>
  );
}
