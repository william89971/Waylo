import Link from "next/link";
import { redirect } from "next/navigation";
import { CalGetcPanel } from "@/components/cal-getc-panel";
import { CounselorConfirmationList } from "@/components/counselor-confirmation-list";
import { CounselorHandoff } from "@/components/counselor-handoff";
import { citationsFromAudit, CounselorPacket } from "@/components/counselor-packet";
import type { CourseEvidencePayload } from "@/components/evidence-drawer";
import { HomeSemesterList, type HomeSemesterCourse } from "@/components/home-semester-list";
import { WaypointDrawPlayer } from "@/components/waypoint-draw-player";
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
import { generateMultiTargetProductionPlan, listSelectableTargets, MULTI_TARGET_DATA_RELEASE } from "@/lib/server/production-planning";
import { studentRepository } from "@/lib/server/student-repository";
import { courseWhySentence, formatSelectableTargetLabel, isOfficialVerifiedSource, officialSourceLabel } from "@/lib/student-facing-copy";

export const dynamic = "force-dynamic";

function labelFor(targets: SelectableTarget[], id: string) {
  return formatSelectableTargetLabel(targets, id);
}

function scheduledFor(
  course: SavedPlan["route"]["terms"][number]["courses"][number],
  plan: SavedPlan,
  auditPlan = plan.multiTargetPlan,
) {
  const dashed = course.code.replace(/\s+/g, "-").toUpperCase();
  const spaced = course.code.replace(/-/g, " ");
  return (auditPlan ?? plan.multiTargetPlan)?.schedule.terms
    .flatMap((term) => term.courses)
    .find(
      (item) =>
        item.courseId === course.courseId ||
        item.code === course.code ||
        item.code === dashed ||
        item.code === spaced,
    );
}

function whyThisClass(
  course: SavedPlan["route"]["terms"][number]["courses"][number],
  plan: SavedPlan,
  targets: SelectableTarget[],
  graph: ArticulationGraph | null,
  primaryLabel: string,
  auditPlan = plan.multiTargetPlan,
) {
  const scheduled = scheduledFor(course, plan, auditPlan);
  if (scheduled && graph) {
    const parts = scheduled.fulfillsTargetIds.map((id) => {
      const rule = pickRuleForCourse(graph.rulesByTargetMajorId.get(id) ?? [], scheduled.code);
      return { school: formatSelectableTargetLabel(targets, id), requirement: rule?.label };
    });
    return courseWhySentence(parts);
  }
  const schoolLabels = scheduled ? scheduled.fulfillsTargetIds.map((id) => formatSelectableTargetLabel(targets, id)) : [primaryLabel];
  return courseWhySentence(schoolLabels.map((school) => ({ school })));
}

function primaryEvidenceTier(
  course: SavedPlan["route"]["terms"][number]["courses"][number],
  plan: SavedPlan,
  graph: ArticulationGraph | null,
  primaryId: string,
  auditPlan = plan.multiTargetPlan,
): VerificationTier | undefined {
  const scheduled = scheduledFor(course, plan, auditPlan);
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
  auditPlan = plan.multiTargetPlan,
): "verified" | "suggestion" | "review" {
  const tier = primaryEvidenceTier(course, plan, graph, primaryId, auditPlan);
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
  const assistVerified = first?.provenance === "assist" && first.status === "verified";
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
        verificationTier: assistVerified ? "VERIFIED_ASSIST" : "NEEDS_COUNSELOR_CONFIRMATION",
        sourceType: first?.provenance === "assist" ? "assist_public" : "institutional_guide",
        sourceUrl: assistVerified ? first?.url : undefined,
        agreementYear: assistVerified ? first?.effectiveYear : undefined,
        notes: first?.note,
      },
    ],
  };
}

function evidenceLookup(
  byCode: Record<string, CourseEvidencePayload>,
  code: string,
) {
  return byCode[code] ?? byCode[code.replace(/\s+/g, "-")] ?? byCode[code.replace(/-/g, " ")];
}

function aliasEvidence(byCode: Record<string, CourseEvidencePayload>) {
  const aliased = { ...byCode };
  for (const [code, payload] of Object.entries(byCode)) {
    aliased[code.replace(/-/g, " ")] = payload;
    aliased[code.replace(/\s+/g, "-")] = payload;
  }
  return aliased;
}

function officialCampus(payload: CourseEvidencePayload | undefined) {
  return payload?.campuses.find((campus) => campus.required && isOfficialVerifiedSource(campus));
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
  const [targets, graph, generatedAudit] = await Promise.all([
    listSelectableTargets(),
    loadActiveArticulationGraph(),
    plan.multiTargetPlan ? Promise.resolve(undefined) : generateMultiTargetProductionPlan(workspace),
  ]);
  const auditPlan = plan.multiTargetPlan ?? generatedAudit;
  const primaryId = plan.primaryTargetId ?? workspace.primaryTargetId;
  const secondaryIds = plan.secondaryTargetIds ?? workspace.secondaryTargetIds ?? [];
  const primaryLabel = labelFor(targets, primaryId);
  const secondaryLabels = secondaryIds.map((id) => labelFor(targets, id));
  const reviewCount = (auditPlan?.auditSummary ?? []).reduce(
    (count, audit) =>
      count +
      audit.requirementStates.filter(
        (requirement) => requirement.verificationTier === "NEEDS_COUNSELOR_CONFIRMATION" && !requirement.historySatisfied,
      ).length,
    0,
  );
  const completedCount = workspace.courses.filter((course) => course.status === "completed").length;
  const strategy = buildAdmissionsStrategy(workspace, targets, {
    hasValidPlan: true,
    plannedCourseCodes: route.terms.flatMap((term) => term.courses.map((course) => course.code)),
    reviewItemCount: reviewCount,
  });
  const saved = (await searchParams).saved === "1";
  const alreadyDone = (auditPlan?.auditSummary ?? []).flatMap((audit) => {
    const school = labelFor(targets, audit.targetMajorId);
    return audit.requirementStates
      .filter((requirement) => requirement.historySatisfied)
      .slice(0, 3)
      .map((requirement) => ({
        key: `${audit.targetMajorId}:${requirement.requirementKey}`,
        label: requirement.label,
        school,
      }));
  });
  const stillMissing = (auditPlan?.auditSummary ?? []).flatMap((audit) =>
    audit.requirementStates
      .filter((requirement) => !requirement.satisfied)
      .map((requirement) => ({
        key: `${audit.targetMajorId}:${requirement.requirementKey}`,
        label: requirement.label,
        school: labelFor(targets, audit.targetMajorId),
        review: requirement.verificationTier === "NEEDS_COUNSELOR_CONFIRMATION",
      })),
  );
  const unmatched = unmatchedCompletedCourses(workspace.courses, graph);
  const selectedTargets = targets.filter((target) => target.id === primaryId || secondaryIds.includes(target.id));
  const counselorItems = buildCounselorConfirmationItems({
    courses: workspace.courses,
    graph,
    plan: auditPlan,
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
  const graphEvidence = auditPlan ? buildEvidenceByCourseCode(auditPlan, graph) : {};
  const evidenceByCourseCode = aliasEvidence({
    ...Object.fromEntries((nextTerm?.courses ?? []).map((course) => [course.code, legacyEvidenceByCourse(course, primaryLabel)])),
    ...graphEvidence,
  });
  for (const course of nextTerm?.courses ?? []) {
    const graphCode = graphCodeForStudentCourse({ catalogCourseId: course.courseId, code: course.code }, graph);
    const payload =
      evidenceLookup(evidenceByCourseCode, graphCode ?? course.code) ??
      evidenceLookup(evidenceByCourseCode, course.code);
    if (!payload) continue;
    evidenceByCourseCode[course.code] = payload;
    if (graphCode) evidenceByCourseCode[graphCode] = payload;
  }
  const nextCourses: HomeSemesterCourse[] = (nextTerm?.courses ?? []).map((course) => {
    const graphCode = graphCodeForStudentCourse({ catalogCourseId: course.courseId, code: course.code }, graph);
    const payload =
      evidenceLookup(evidenceByCourseCode, graphCode ?? course.code) ??
      evidenceLookup(evidenceByCourseCode, course.code);
    const sourceCampus = officialCampus(payload);
    let state = courseEvidenceState(course, plan, graph, primaryId, auditPlan);
    if (sourceCampus) state = "verified";
    else if (state === "verified") state = "review";
    const tier = sourceCampus?.verificationTier ?? primaryEvidenceTier(course, plan, graph, primaryId, auditPlan);
    return {
      courseId: course.courseId,
      code: course.code,
      title: course.title,
      units: course.units,
      why: whyThisClass(course, plan, targets, graph, primaryLabel, auditPlan),
      state,
      tier: state === "verified" ? tier : state === "review" ? "NEEDS_COUNSELOR_CONFIRMATION" : tier,
      sourceUrl: sourceCampus?.sourceUrl,
      sourceLabel: sourceCampus?.agreementYear ? officialSourceLabel(sourceCampus.agreementYear) : undefined,
    };
  });
  const scheduleRows =
    auditPlan?.schedule.terms.flatMap((term) =>
      term.courses.map((course) => ({
        termLabel: term.label,
        code: course.code,
        title: course.title,
        semesterUnits: course.semesterUnits,
        bucket: course.bucket,
      })),
    ) ??
    route.terms.flatMap((term) =>
      term.courses.map((course) => ({
        termLabel: term.label,
        code: course.code,
        title: course.title,
        semesterUnits: course.units,
      })),
    );
  const citations = citationsFromAudit(auditPlan?.auditSummary, graph, (id) => labelFor(targets, id));
  const packetUnits = auditPlan?.totalSemesterUnits ?? route.terms.reduce((sum, term) => sum + term.totalUnits, 0);

  return (
    <div className="production-page dashboard-page">
      <div className="no-print">
      {saved ? (
        <div className="success-banner" role="status">
          <WaypointDrawPlayer />
          Plan saved.
        </div>
      ) : null}
      <header className="production-page-header">
        <h1>What to take next semester</h1>
        <p>
          {primaryLabel}
          {secondaryLabels.length ? ` · also ${secondaryLabels.join(", ")}` : ""}
        </p>
      </header>
      <section className="recommended-semester">
        <HomeSemesterList
          courses={nextCourses}
          totalUnits={nextTerm?.totalUnits ?? 0}
          termLabel={nextTerm?.label ?? "Next term"}
          evidenceByCourseCode={evidenceByCourseCode}
        />
        <CounselorHandoff
          email={{
            studentName: workspace.profile.preferredName,
            primaryLabel,
            secondaryLabels,
            nextTermLabel: nextTerm?.label ?? "Next term",
            courses: nextCourses.map((course) => ({
              code: course.code,
              title: course.title,
              units: course.units,
            })),
            totalUnits: nextTerm?.totalUnits ?? 0,
          }}
        >
          <Link href="/app/plan" className="production-button">
            See all terms
          </Link>
        </CounselorHandoff>
        <nav className="home-followups" aria-label="Plan details">
          {strategy ? (
            <Link href="/app/plan#admissions-strategy">Read the strategy note</Link>
          ) : null}
          <Link href="/onboarding?units=1">Change unit limit</Link>
        </nav>
        <div className="already-counted">
          <h2>Already finished</h2>
          {alreadyDone.length ? (
            <ul className="status-scan">
              {alreadyDone.map((item) => (
                <li key={item.key}>
                  <strong>{item.label}</strong>
                  <span>{item.school}</span>
                  <em>Done</em>
                </li>
              ))}
            </ul>
          ) : unmatched.length ? null : (
            <p>
              {completedCount
                ? "None close a listed requirement yet."
                : "No finished classes yet."}
            </p>
          )}
          {unmatched.length ? (
            <ul className="status-scan">
              {unmatched.map((course) => (
                <li key={`${course.code}-${course.title}`}>
                  <strong className="font-mono tabular-nums">{course.code}</strong>
                  <span>{course.title}</span>
                  <em className="review">Unmatched</em>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {stillMissing.length ? (
          <div className="already-counted">
            <h2>Still missing after this plan</h2>
            <ul className="status-scan">
              {stillMissing.slice(0, 4).map((item) => (
                <li key={item.key}>
                  <strong>{item.label}</strong>
                  <span>{item.school}</span>
                  <em className={item.review ? "review" : "open"}>{item.review ? "Ask a counselor" : "Open"}</em>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <CalGetcPanel areas={calGetc} />
        <CounselorConfirmationList items={counselorItems} />
      </section>
      </div>
      <CounselorPacket
        preferredName={workspace.profile.preferredName}
        primaryLabel={primaryLabel}
        secondaryLabels={secondaryLabels}
        scheduleRows={scheduleRows}
        totalSemesterUnits={packetUnits}
        citations={citations}
        academicDataVersion={MULTI_TARGET_DATA_RELEASE}
        strategy={strategy}
      />
    </div>
  );
}
