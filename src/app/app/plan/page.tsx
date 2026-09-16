import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, LockKeyhole } from "lucide-react";
import { CounselorPacket } from "@/components/counselor-packet";
import { EvidenceStatus } from "@/components/evidence-status";
import { ExportCounselorPacketButton } from "@/components/export-counselor-packet-button";
import { PlanMatrixWorkspace } from "@/components/plan-matrix-workspace";
import { SavePlanButton } from "@/components/save-plan-button";
import { evidenceById, programById } from "@/lib/academic-data";
import { loadActiveArticulationGraph } from "@/lib/articulation/load-graph";
import {
  buildEvidenceByCourseCode,
  buildMatrixCampuses,
  buildMatrixRows,
} from "@/lib/articulation/matrix-view";
import type { VerificationTier } from "@/lib/articulation/types";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import {
  generateMultiTargetProductionPlan,
  generateProductionPlan,
  listSelectableTargets,
  productionEvidenceState,
  shouldUseLegacyUcsdPlanner,
  MULTI_TARGET_DATA_RELEASE,
  UCSD_DATA_RELEASE,
} from "@/lib/server/production-planning";
import { studentRepository } from "@/lib/server/student-repository";

export const dynamic = "force-dynamic";

function legacyTier(status?: string): VerificationTier {
  return status === "verified" ? "VERIFIED_ASSIST" : "NEEDS_COUNSELOR_CONFIRMATION";
}

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const clerkUserId = await getAuthenticatedUserId();
  if (!clerkUserId) redirect("/sign-in");
  const workspace = await studentRepository.load(clerkUserId);
  if (!workspace.profile.onboardingCompleted) redirect("/onboarding");
  const showProposal = (await searchParams).new === "1" || !workspace.activePlan;
  const targets = await listSelectableTargets();
  const labelFor = (id: string) => targets.find((target) => target.id === id)?.displayName ?? id;

  if (!shouldUseLegacyUcsdPlanner(workspace)) {
    const [multi, graph] = await Promise.all([
      generateMultiTargetProductionPlan(workspace),
      loadActiveArticulationGraph(),
    ]);
    const citations = multi.auditSummary.flatMap((audit) =>
      audit.requirementStates.map((requirement) => {
        const rule = graph.rules.find(
          (item) =>
            item.targetMajorId === audit.targetMajorId && item.requirementKey === requirement.requirementKey,
        );
        return {
          targetLabel: labelFor(audit.targetMajorId),
          requirementKey: requirement.requirementKey,
          label: requirement.label,
          verificationTier: requirement.verificationTier,
          effectiveYear: rule?.effectiveYear ?? "—",
          sourceType: rule?.sourceType ?? "—",
          satisfied: requirement.satisfied,
        };
      }),
    );
    const scheduleRows = multi.schedule.terms.flatMap((term) =>
      term.courses.map((course) => ({
        termLabel: term.label,
        code: course.code,
        title: course.title,
        semesterUnits: course.semesterUnits,
        bucket: course.bucket,
      })),
    );
    const matrixCampuses = buildMatrixCampuses(multi, graph);
    const matrixRows = buildMatrixRows(multi, graph);
    const evidenceByCourseCode = buildEvidenceByCourseCode(multi, graph);

    return (
      <div className="production-page plan-page">
        <header className="production-page-header plan-header-actions">
          <div>
            <h1>{showProposal ? "Review your multi-target plan" : "Your multi-target plan"}</h1>
            <p>
              Primary: {labelFor(multi.primaryTargetId)}
              {multi.secondaryTargetIds.length
                ? ` · Secondary: ${multi.secondaryTargetIds.map(labelFor).join(", ")}`
                : ""}
            </p>
          </div>
          <ExportCounselorPacketButton />
        </header>
        {showProposal ? (
          <div className="proposal-banner no-print">
            <LockKeyhole />
            <div>
              <strong>Proposed — not saved</strong>
              <span>
                Semester packing uses College of the Canyons units. Destination audits convert units only below.
              </span>
            </div>
          </div>
        ) : null}
        {!workspace.includeSecondaryDivergence ? (
          <div className="review-banner no-print">
            <AlertTriangle />
            <div>
              <strong>Secondary divergence courses are omitted.</strong>
              <span>Enable secondary major prep to include secondary-only requirements in the schedule.</span>
            </div>
          </div>
        ) : null}
        {multi.divergencePoints.length ? (
          <div className="review-banner no-print">
            <AlertTriangle />
            <div>
              <strong>Divergence trade-offs</strong>
              <ul>
                {multi.divergencePoints.map((point) => (
                  <li key={point.id}>{point.message}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        <section className="no-print matrix-section" aria-label="Multi-campus articulation matrix">
          <div className="matrix-heading">
            <div>
              <h2>Articulation matrix</h2>
              <p>
                Each row is a planned College of the Canyons course. Select a row to see why it is verified or still needs review. PRI is your first-choice campus.
              </p>
            </div>
            <p className="matrix-totals">
              {multi.totalSemesterUnits.toFixed(1)} COC units · {matrixRows.length} courses
            </p>
          </div>
          <ul className="status-legend" aria-label="Articulation status key">
            <li className="verified">Verified</li>
            <li className="review">Needs counselor review</li>
            <li className="unrequired">Not required</li>
          </ul>
          <p className="scroll-hint">Swipe sideways to compare campuses.</p>
          <PlanMatrixWorkspace
            campuses={matrixCampuses}
            rows={matrixRows}
            evidenceByCourseCode={evidenceByCourseCode}
          />
          {multi.schedule.terms.some((term) => term.conflicts.length > 0) ? (
            <ul className="space-y-1 text-sm text-amber-800" role="status">
              {multi.schedule.terms.flatMap((term) =>
                term.conflicts.map((conflict, index) => (
                  <li key={`${term.id}-conflict-${index}`}>
                    {term.label}: {conflict.message} Trade-off courses:{" "}
                    {conflict.tradeoffCourseIds.join(", ")}
                  </li>
                )),
              )}
            </ul>
          ) : null}
        </section>
        <section id="requirements" className="audit-section no-print" aria-label="Destination audit summaries">
          <div className="section-heading">
            <h2>Destination audits</h2>
            <p>How each campus counts these courses. Green is confirmed; amber still needs a counselor.</p>
          </div>
          {multi.auditSummary.map((audit) => (
            <article className="audit-block" key={audit.targetMajorId}>
              <header>
                <strong>{labelFor(audit.targetMajorId)}</strong>
                <span>
                  {audit.articulatedUnits} / {audit.juniorStandingUnits} {audit.unitSystem} units
                  {audit.juniorStandingMet ? " · junior standing met" : " · junior standing in progress"}
                </span>
              </header>
              <ul>
                {audit.requirementStates.map((requirement) => (
                  <li key={requirement.requirementKey}>
                    <span>
                      {requirement.label}:{" "}
                      {requirement.satisfied ? "satisfied" : `missing ${requirement.missingCourseCodes.join(", ")}`}
                    </span>
                    <EvidenceStatus tier={requirement.verificationTier} />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
        <div className="plan-footer no-print">
          <div>
            <strong>Total planned</strong>
            <span>{multi.totalSemesterUnits} COC semester units</span>
            <small>Academic data: {MULTI_TARGET_DATA_RELEASE}</small>
          </div>
          <Link href={showProposal ? "/app/plan" : "/app/plan?new=1"} className="production-button primary">
            {showProposal ? "Keep this proposal" : "Generate a fresh proposal"}
          </Link>
        </div>
        <CounselorPacket
          preferredName={workspace.profile.preferredName}
          primaryLabel={labelFor(multi.primaryTargetId)}
          secondaryLabels={multi.secondaryTargetIds.map(labelFor)}
          scheduleRows={scheduleRows}
          totalSemesterUnits={multi.totalSemesterUnits}
          citations={citations}
          academicDataVersion={MULTI_TARGET_DATA_RELEASE}
          algorithmVersion={multi.algorithmVersion}
          evaluatedAt={multi.evidenceGraphSnapshot.evaluatedAt}
        />
      </div>
    );
  }

  const result = generateProductionPlan(workspace);
  const route = showProposal ? result.routes[0] : workspace.activePlan?.route ?? result.routes[0];
  if (!route) {
    return (
      <div className="production-page">
        <header className="production-page-header">
          <h1>We need more information</h1>
          <p>Waylo could not build a valid route from the confirmed courses. Review your history and try again.</p>
        </header>
        <Link href="/onboarding" className="production-button primary">
          Review your courses
        </Link>
      </div>
    );
  }

  const program = programById.get("ucsd-data");
  const legacyScheduleRows = route.terms.flatMap((term) =>
    term.courses.map((course) => ({
      termLabel: term.label,
      code: course.code,
      title: course.title,
      semesterUnits: course.units,
    })),
  );
  const legacyCitations = route.terms.flatMap((term) =>
    term.courses.flatMap((course) =>
      course.evidenceIds.map((evidenceId) => {
        const item = evidenceById.get(evidenceId);
        return {
          targetLabel: `${program?.universityName ?? "UC San Diego"} ${program?.name ?? "Data Science"}`,
          requirementKey: `${evidenceId}:${course.code}`,
          label: item?.title ?? course.code,
          verificationTier: legacyTier(item?.status),
          effectiveYear: item?.effectiveYear ?? "—",
          sourceType: item?.provenance ?? "legacy",
          satisfied: true,
        };
      }),
    ),
  );
  const totalUnits = route.terms.reduce((sum, term) => sum + term.totalUnits, 0);

  return (
    <div className="production-page plan-page">
      <header className="production-page-header plan-header-actions">
        <div>
          <h1>{showProposal ? "Review your transfer plan" : "Your transfer plan"}</h1>
          <p>
            {program?.universityName} {program?.name} {program?.degree} · {route.label}
          </p>
        </div>
        <ExportCounselorPacketButton />
      </header>
      {showProposal ? (
        <div className="proposal-banner no-print">
          <LockKeyhole />
          <div>
            <strong>Proposed — not saved</strong>
            <span>Review the semester sequence and evidence before saving this plan.</span>
          </div>
        </div>
      ) : null}
      {productionEvidenceState() === "needs_review" ? (
        <div className="review-banner no-print">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>This plan contains articulation items that need confirmation.</strong>
            <span>
              You can save it as a planning route, but it is not an official degree audit or verified articulation
              agreement.
            </span>
          </div>
          <Link href="/app/evidence">Review evidence</Link>
        </div>
      ) : null}
      <ul className="status-legend no-print" aria-label="Course status key">
        <li className="verified">Verified or planning suggestion</li>
        <li className="review">Needs counselor confirmation</li>
      </ul>
      <p className="scroll-hint no-print">Swipe sideways to see later semesters.</p>
      <section id="requirements" className="semester-timeline no-print" aria-label="Semester-by-semester plan">
        {route.terms.map((term) => (
          <article className="semester-column" key={term.id}>
            <header>
              <strong>{term.label}</strong>
              <span>{term.totalUnits} units planned</span>
            </header>
            <div>
              {term.courses.map((course) => {
                const needsReview = course.evidenceIds.some((id) => evidenceById.get(id)?.status !== "verified");
                return (
                  <section className={`plan-course ${needsReview ? "needs-review" : ""}`} key={course.courseId}>
                    <strong>{course.code}</strong>
                    <span>{course.title}</span>
                    <small>{course.units} units</small>
                    <EvidenceStatus state={needsReview ? "review" : "suggestion"} />
                    <Link href={`/app/evidence?course=${course.courseId}`}>
                      View source <ArrowRight />
                    </Link>
                  </section>
                );
              })}
            </div>
          </article>
        ))}
      </section>
      <div className="plan-footer no-print">
        <div>
          <strong>Estimated transfer</strong>
          <span>{route.estimatedTransferTerm}</span>
          <small>Academic data: {UCSD_DATA_RELEASE}</small>
        </div>
        {showProposal ? (
          <SavePlanButton strategy={route.strategy} />
        ) : (
          <Link href="/app/plan?new=1" className="production-button">
            Generate a fresh proposal
          </Link>
        )}
      </div>
      <section id="what-if" className="what-if-placeholder no-print">
        <h2>If your schedule changes</h2>
        <p>
          The protected what-if workflow will preview timing and downstream course changes without overwriting this
          saved plan.
        </p>
        <button className="production-button" disabled>
          What-if planning arrives after Preview validation
        </button>
      </section>
      <CounselorPacket
        preferredName={workspace.profile.preferredName}
        primaryLabel={`${program?.universityName ?? "UC San Diego"} ${program?.name ?? "Data Science"}`}
        secondaryLabels={[]}
        scheduleRows={legacyScheduleRows}
        totalSemesterUnits={totalUnits}
        citations={legacyCitations}
        academicDataVersion={UCSD_DATA_RELEASE}
      />
    </div>
  );
}
