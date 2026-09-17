import Link from "next/link";
import { redirect } from "next/navigation";
import { AdmissionsStrategyPanel } from "@/components/admissions-strategy-panel";
import { CounselorConfirmationList } from "@/components/counselor-confirmation-list";
import { CounselorPacket } from "@/components/counselor-packet";
import { EvidenceStatus } from "@/components/evidence-status";
import { ExportCounselorPacketButton } from "@/components/export-counselor-packet-button";
import { PlanMatrixWorkspace } from "@/components/plan-matrix-workspace";
import { SavePlanButton } from "@/components/save-plan-button";
import { evidenceById, programById } from "@/lib/academic-data";
import { buildAdmissionsStrategy } from "@/lib/admissions-strategy";
import { loadActiveArticulationGraph } from "@/lib/articulation/load-graph";
import { buildCounselorConfirmationItems } from "@/lib/articulation/counselor-confirmation";
import {
  buildEvidenceByCourseCode,
  buildMatrixCampuses,
  buildMatrixRows,
} from "@/lib/articulation/matrix-view";
import type { DivergencePoint, VerificationTier } from "@/lib/articulation/types";
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
import {
  divergenceDisplay,
  formatCourseCode,
  formatSelectableTargetLabel,
  requirementProgressLabel,
  studentFacingDataRelease,
} from "@/lib/student-facing-copy";

export const dynamic = "force-dynamic";

function legacyTier(status?: string): VerificationTier {
  return status === "verified" ? "VERIFIED_ASSIST" : "NEEDS_COUNSELOR_CONFIRMATION";
}

function DivergenceList({
  points,
  labelFor,
}: {
  points: DivergencePoint[];
  labelFor: (id: string) => string;
}) {
  if (!points.length) return null;
  return (
    <section className="divergence-section no-print">
      <h2>Schools want different classes</h2>
      <p>They stay on this plan because you selected more than one school.</p>
      <ul className="divergence-list">
        {points.map((point) => {
          const { code, line } = divergenceDisplay(point, labelFor);
          return (
            <li key={point.id}>
              <strong className="font-mono tabular-nums">{code}</strong>
              <span>{line}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ new?: string; course?: string }> }) {
  const clerkUserId = await getAuthenticatedUserId();
  if (!clerkUserId) redirect("/sign-in");
  const workspace = await studentRepository.load(clerkUserId);
  if (!workspace.profile.onboardingCompleted) redirect("/onboarding");
  const params = await searchParams;
  const showProposal = params.new === "1" || !workspace.activePlan;
  const focusCourse = params.course?.trim() || null;
  const targets = await listSelectableTargets();
  const labelFor = (id: string) => formatSelectableTargetLabel(targets, id);

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
          historySatisfied: requirement.historySatisfied,
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
    const selectedTargets = targets.filter(
      (target) => target.id === multi.primaryTargetId || multi.secondaryTargetIds.includes(target.id),
    );
    const counselorItems = buildCounselorConfirmationItems({
      courses: workspace.courses,
      graph,
      plan: multi,
      targets: selectedTargets,
    });
    const nextTerm = multi.schedule.terms[0];
    const strategy = buildAdmissionsStrategy(workspace, targets, {
      hasValidPlan: true,
      plannedCourseCodes: multi.schedule.terms.flatMap((term) => term.courses.map((course) => course.code)),
      reviewItemCount: multi.auditSummary.reduce(
        (count, audit) =>
          count +
          audit.requirementStates.filter(
            (requirement) =>
              !requirement.satisfied || requirement.verificationTier === "NEEDS_COUNSELOR_CONFIRMATION",
          ).length,
        0,
      ),
    });

    return (
      <div className="production-page plan-page">
        <header className="production-page-header plan-header-actions">
          <div>
            <h1>{showProposal ? "Proposed sequence" : "All terms"}</h1>
            <p>
              For {labelFor(multi.primaryTargetId)}
              {multi.secondaryTargetIds.length
                ? ` · also ${multi.secondaryTargetIds.map(labelFor).join(", ")}`
                : ""}
              .
            </p>
          </div>
          <ExportCounselorPacketButton />
        </header>
        {showProposal ? (
          <div className="proposal-banner no-print">
            <strong>Proposed — not saved</strong>
            <span>Save it so next semester stays on Home.</span>
          </div>
        ) : (
          <p className="plan-secondary-note no-print">
            Next semester is also on <Link href="/app">Home</Link>.
          </p>
        )}
        {nextTerm ? (
          <section className="next-term-hero no-print" aria-label="Next semester recap">
            <h2>Next semester · {nextTerm.label}</h2>
            {nextTerm.courses.length ? (
              <ol className="next-term-codes">
                {nextTerm.courses.map((course) => (
                  <li key={course.code}>
                    <strong className="font-mono tabular-nums">{course.code}</strong>
                    <span>
                      {course.title} · {course.semesterUnits} units
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No classes scheduled.</p>
            )}
            <div className="next-term-hero-meta">
              <p>{nextTerm.totalSemesterUnits} COC units</p>
              {showProposal ? (
                <SavePlanButton strategy="overlap" />
              ) : (
                <Link href="/app" className="production-text-link">
                  Open on Home
                </Link>
              )}
            </div>
          </section>
        ) : null}
        {!workspace.includeSecondaryDivergence ? (
          <div className="review-banner no-print">
            <strong>Classes that only the second school needs are left off this schedule.</strong>
            <span>Turn that option back on if you want one plan that covers every selected school.</span>
          </div>
        ) : null}
        <CounselorConfirmationList items={counselorItems} />
        <DivergenceList points={multi.divergencePoints} labelFor={labelFor} />
        <section className="no-print matrix-section" aria-label="Multi-campus articulation matrix">
          <div className="matrix-heading">
            <div>
              <h2>How each class counts</h2>
              <p>
                Tap a class to see why it counts, and which school still needs a counselor.
              </p>
            </div>
            <p className="matrix-totals">
              {multi.totalSemesterUnits.toFixed(1)} COC units · {matrixRows.length} courses
            </p>
          </div>
          <ul className="status-legend" aria-label="Articulation status key">
            <li className="verified">Official</li>
            <li className="review">Ask a counselor</li>
            <li className="unrequired">Not required</li>
          </ul>
          <p className="scroll-hint">Swipe sideways to compare campuses.</p>
          <PlanMatrixWorkspace
            campuses={matrixCampuses}
            rows={matrixRows}
            evidenceByCourseCode={evidenceByCourseCode}
            initialCourseCode={focusCourse}
          />
          {multi.schedule.terms.some((term) => term.conflicts.length > 0) ? (
            <ul className="space-y-1 text-sm text-amber-800" role="status">
              {multi.schedule.terms.flatMap((term) =>
                term.conflicts.map((conflict, index) => (
                  <li key={`${term.id}-conflict-${index}`}>
                    {term.label}: {conflict.message} Courses held for a later term:{" "}
                    {conflict.tradeoffCourseIds.map((id) => formatCourseCode(graph, id)).join(", ")}
                  </li>
                )),
              )}
            </ul>
          ) : null}
        </section>
        <section id="requirements" className="audit-section no-print" aria-label="Destination audit summaries">
          <div className="section-heading">
            <h2>What&apos;s left at each school</h2>
            <p>Green is an official agreement. Amber means ask a counselor before you enroll.</p>
          </div>
          {multi.auditSummary.map((audit) => (
            <article className="audit-block" key={audit.targetMajorId}>
              <header>
                <strong>{labelFor(audit.targetMajorId)}</strong>
                <span>
                  {audit.articulatedUnits} / {audit.juniorStandingUnits} {audit.unitSystem} units
                  {audit.juniorStandingMet ? " · enough units for junior standing" : " · still building junior standing"}
                </span>
              </header>
              <ul>
                {audit.requirementStates.map((requirement) => (
                  <li key={requirement.requirementKey}>
                    <span>
                      {requirement.label}: {requirementProgressLabel(requirement)}
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
            <small>{studentFacingDataRelease(MULTI_TARGET_DATA_RELEASE)}</small>
          </div>
          {showProposal ? (
            <SavePlanButton strategy="overlap" />
          ) : (
            <Link href="/app/plan?new=1" className="production-button">
              Rebuild this plan
            </Link>
          )}
        </div>
        {strategy ? <AdmissionsStrategyPanel strategy={strategy} /> : null}
        <CounselorPacket
          preferredName={workspace.profile.preferredName}
          primaryLabel={labelFor(multi.primaryTargetId)}
          secondaryLabels={multi.secondaryTargetIds.map(labelFor)}
          scheduleRows={scheduleRows}
          totalSemesterUnits={multi.totalSemesterUnits}
          citations={citations}
          academicDataVersion={MULTI_TARGET_DATA_RELEASE}
          strategy={strategy}
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
  const strategy = buildAdmissionsStrategy(workspace, targets, {
    hasValidPlan: true,
    plannedCourseCodes: route.terms.flatMap((term) => term.courses.map((course) => course.code)),
    reviewItemCount: [...new Set(route.terms.flatMap((term) => term.courses.flatMap((course) => course.evidenceIds)))].filter(
      (id) => evidenceById.get(id)?.status !== "verified",
    ).length,
  });

  return (
    <div className="production-page plan-page">
      <header className="production-page-header plan-header-actions">
        <div>
          <h1>{showProposal ? "Proposed sequence" : "All terms"}</h1>
          <p>For {labelFor(workspace.primaryTargetId)}.</p>
        </div>
        <ExportCounselorPacketButton />
      </header>
      {showProposal ? (
        <div className="proposal-banner no-print">
          <strong>Proposed — not saved</strong>
          <span>Save it so next semester stays on Home.</span>
        </div>
      ) : null}
      {route.terms[0] ? (
        <section className="next-term-hero no-print" aria-label="Next semester recap">
          <h2>Next semester · {route.terms[0].label}</h2>
          <ol className="next-term-codes">
            {route.terms[0].courses.map((course) => (
              <li key={course.courseId}>
                <strong className="font-mono tabular-nums">{course.code}</strong>
                <span>
                  {course.title} · {course.units} units
                </span>
              </li>
            ))}
          </ol>
          <div className="next-term-hero-meta">
            <p>{route.terms[0].totalUnits} COC units</p>
            {showProposal ? <SavePlanButton strategy={route.strategy} /> : (
              <Link href="/app" className="production-text-link">
                Open on Home
              </Link>
            )}
          </div>
        </section>
      ) : null}
      {productionEvidenceState() === "needs_review" ? (
        <div className="review-banner no-print">
          <strong>This plan contains articulation items that need confirmation.</strong>
          <span>
            You can save it as a planning route, but it is not an official degree audit or verified articulation
            agreement.
          </span>
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
                    <Link href={`/app/evidence?course=${course.courseId}`}>Why this class</Link>
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
          <small>{studentFacingDataRelease(UCSD_DATA_RELEASE)}</small>
        </div>
        {showProposal ? (
          <SavePlanButton strategy={route.strategy} />
        ) : (
          <Link href="/app/plan?new=1" className="production-button">
            Rebuild this plan
          </Link>
        )}
      </div>
      {strategy ? <AdmissionsStrategyPanel strategy={strategy} /> : null}
      <CounselorPacket
        preferredName={workspace.profile.preferredName}
        primaryLabel={labelFor(workspace.primaryTargetId)}
        secondaryLabels={[]}
        scheduleRows={legacyScheduleRows}
        totalSemesterUnits={totalUnits}
        citations={legacyCitations}
        academicDataVersion={UCSD_DATA_RELEASE}
        strategy={strategy}
      />
    </div>
  );
}
