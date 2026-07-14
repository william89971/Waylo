"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BriefcaseBusiness, Check, Database, Flag, GitBranch, Route, ShieldCheck, Wrench } from "lucide-react";
import { AcademicRouteCanvas } from "@/components/academic-route-canvas";
import { AcademicTimeMachine } from "@/components/academic-time-machine";
import { WayloCommandBar } from "@/components/waylo-command-bar";
import { UncertaintyActionCard } from "@/components/uncertainty-action-card";
import { RouteSelector } from "@/components/route-selector";
import { buildAcademicTwin } from "@/lib/academic-twin";
import { programById } from "@/lib/academic-data";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { TimeMachineState } from "@/lib/domain";
import { Status, Tag } from "@/components/ui";

export function AcademicTwinWorkspace() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const simulation = useWorkspaceStore((state) => state.simulationResult);
  const [timeState, setTimeState] = useState<TimeMachineState>("baseline");
  const baseline = simulation?.baselineRoute ?? workspace.plan?.routes.find((route) => route.id === workspace.activeRouteId) ?? workspace.plan?.routes[0];
  const twin = useMemo(() => workspace.plan && baseline ? buildAcademicTwin({ profile: workspace.profile, plan: workspace.plan, constraints: workspace.constraints, selectedDestinationIds: workspace.selectedDestinationIds, reviewResolutions: workspace.reviewResolutions }) : undefined, [baseline, workspace]);
  if (!workspace.plan || !baseline || !twin) return <div className="academic-twin-empty"><Route /><h2>No validated route yet</h2><p>Choose one of the six supported pathways to build the Academic Twin.</p></div>;

  const proposed = simulation?.proposedRoute;
  const repaired = simulation?.repairedRoute;
  const availableState = timeState === "proposed" && !proposed ? "baseline" : timeState === "repaired" && !repaired ? "baseline" : timeState;
  const displayedRoute = availableState === "proposed" ? proposed! : availableState === "repaired" ? repaired! : baseline;
  const displayedPlan = availableState === "baseline" || !simulation ? workspace.plan : simulation.simulated;
  const displayedConstraints = availableState === "baseline" || !simulation ? workspace.constraints : simulation.simulatedConstraints;
  const displayedProfile = availableState === "baseline" || !simulation ? workspace.profile : simulation.simulatedProfile;
  const program = programById.get(displayedProfile.selectedPathwayId);
  const rejected = displayedPlan.candidateOutcomes.filter((outcome) => outcome.status === "rejected");
  const retainedCount = displayedPlan.candidateOutcomes.filter((outcome) => outcome.status !== "rejected").length;
  const repair = displayedPlan.repairAttempt;

  return (
    <div className="academic-twin-workspace">
      <section className="twin-position-strip" aria-label="Academic Twin position summary">
        <div><span className="position-symbol"><Route /></span><span><small>Current position</small><strong>{workspace.profile.originInstitutionName}</strong></span></div>
        <span className="position-connector" aria-hidden="true" />
        <div><span className="position-symbol destination"><Flag /></span><span><small>Active destination</small><strong>{program?.universityName} · {program?.name}</strong></span></div>
        <span className="position-connector" aria-hidden="true" />
        <div><span className="position-symbol target"><Check /></span><span><small>Current estimate</small><strong>{displayedRoute.estimatedTransferTerm}</strong></span></div>
        <Status tone={workspace.plan.reviewItems.length ? "warning" : "confirmed"} label={`${workspace.plan.reviewItems.length} open review item${workspace.plan.reviewItems.length === 1 ? "" : "s"}`} />
      </section>

      <WayloCommandBar />
      <AcademicTimeMachine value={availableState} onChange={setTimeState} baseline={baseline} proposed={proposed} repaired={repaired} />

      <div className="twin-main-layout">
        <AcademicRouteCanvas route={displayedRoute} timeState={availableState} reviewResolutions={workspace.reviewResolutions} originLabel={workspace.profile.originInstitutionName} destinationLabel={`${program?.universityName ?? "Destination"} ${program?.name ?? "pathway"}`} />
        <aside className="twin-context-rail" aria-label="Route context and next actions">
          <section className="rail-section route-decision">
            <span className="workspace-kicker">Viewing</span>
            <div className="rail-title"><strong>{availableState === "baseline" ? "Saved baseline" : availableState === "proposed" ? "Unsaved proposal" : "Revalidated repair"}</strong><Status tone={displayedRoute.valid ? availableState === "repaired" ? "planned" : "confirmed" : "blocker"} label={displayedRoute.valid ? "Valid" : "Rejected"} /></div>
            <p>{displayedRoute.description}</p>
            {simulation ? <div className="rail-consequence"><GitBranch /><span><strong>{simulation.delta.courseMoves.length} course moves</strong><small>{simulation.delta.baselineTransferTerm} → {simulation.delta.simulatedTransferTerm}</small></span></div> : <p className="rail-muted">Describe a detour to unlock Proposed and Repaired states.</p>}
          </section>
          <section className="rail-section">
            <span className="workspace-kicker">Active constraints</span>
            <dl className="constraint-list">
              <div><dt>Term cap</dt><dd>{displayedConstraints.maxUnits} units</dd></div>
              <div><dt>Summer</dt><dd>{displayedConstraints.summerEnrollment ? `${displayedConstraints.summerCourseLimit} course max` : "Off"}</dd></div>
              <div><dt><BriefcaseBusiness /> Work</dt><dd>{displayedConstraints.weeklyWorkHours ? `${displayedConstraints.weeklyWorkHours} hr/week` : "Not set"}</dd></div>
              <div><dt>Target</dt><dd>{displayedConstraints.transferTarget ? `${displayedConstraints.transferTarget.term} · ${displayedConstraints.transferTarget.policy}` : "Flexible"}</dd></div>
            </dl>
            {displayedConstraints.weeklyWorkHours ? <p className="advisory-note">Work hours guide route ranking only. Your confirmed unit cap is the hard workload validator.</p> : null}
          </section>
          <section className="rail-section">
            <div className="rail-title"><span className="workspace-kicker">Engine record</span><Tag>{twin.academicDataVersion}</Tag></div>
            <div className="engine-counts"><span><Database />{retainedCount} retained</span><span><AlertTriangle />{rejected.length} rejected</span><span><Wrench />{repair ? 1 : 0} repaired</span></div>
            <details className="candidate-drawer"><summary>Inspect candidate outcomes</summary><div>{rejected.slice(0, 5).map((outcome) => <article key={outcome.id}><div><strong>{outcome.route.strategy} candidate</strong><Tag tone="amber">Rejected</Tag></div><p>{outcome.rejectionReasons[0]?.message ?? "Did not pass validation."}</p><small>Outcome {outcome.id}</small></article>)}</div></details>
          </section>
          <section className="rail-section next-action">
            <span className="workspace-kicker">Next action</span>
            <h3>Resolve the Calculus I evidence question</h3>
            <p>See the affected route and timeline consequence before relying on the match.</p>
            <Link href="/evidence" className="rail-link">Open evidence actions <ArrowRight /></Link>
          </section>
          <div className="rail-boundary"><ShieldCheck /><span>Waylo keeps the last valid baseline when every candidate and repair fails.</span></div>
        </aside>
      </div>

      <UncertaintyActionCard courseId="coc-math-211" route={displayedRoute} compact />
      <section className="strategy-drawer"><div><span className="workspace-kicker">Route strategies</span><h2>Compare validated alternatives</h2><p>Strategies use the same evidence and validator with different ranking priorities.</p></div><RouteSelector plan={workspace.plan} /></section>
    </div>
  );
}
