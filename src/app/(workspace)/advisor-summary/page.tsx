"use client";

import { BriefcaseBusiness, Printer, Route, ShieldCheck } from "lucide-react";
import { PageHeader, Status, Tag } from "@/components/ui";
import { UncertaintyActionCard } from "@/components/uncertainty-action-card";
import { buildAdvisorDecisionPacket } from "@/lib/advisor-summary";
import { useWorkspaceStore } from "@/lib/workspace-store";

export default function AdvisorSummaryPage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  if (!workspace.plan) return <div className="page"><PageHeader title="Advisor decision packet" /><div className="empty-state panel"><div><h2>No validated plan yet</h2><p>Choose a supported pathway before creating a packet.</p></div></div></div>;
  const packet = buildAdvisorDecisionPacket(workspace.profile, workspace.plan, workspace.reviewResolutions, workspace.constraints, workspace.simulation);
  return (
    <div className="page">
      <PageHeader title="Advisor decision packet" subtitle="A printable conversation guide with the baseline, proposal, alternatives, workload constraints, exact questions, and evidence boundaries." action={<button className="button primary no-print" type="button" onClick={() => window.print()}><Printer />Print packet</button>} />
      <div className="no-print"><UncertaintyActionCard courseId="coc-math-211" compact /></div>
      <article className="panel advisor-sheet decision-packet">
        <header className="advisor-header"><div><div className="landing-brand advisor-brand">Waylo</div><p className="section-copy">Find your way through college.</p></div><div className="advisor-meta"><strong>{workspace.profile.name}</strong><div className="section-copy">Generated {new Date(packet.generatedAt).toLocaleDateString()}</div><Status tone="warning" label="Counselor review required" /></div></header>
        <section className="packet-route-summary">
          <div><span className="workspace-kicker">Current position</span><strong>{packet.currentPosition}</strong></div>
          <Route aria-hidden="true" />
          <div><span className="workspace-kicker">Destination</span><strong>{packet.destination}</strong></div>
          <div><span className="workspace-kicker">Baseline</span><strong>{packet.baseline.strategy}</strong><small>{packet.baseline.estimatedTransferTerm}</small></div>
        </section>
        <div className="advisor-grid">
          <section className="advisor-section verified-section"><h2>Verified route facts</h2><ul>{packet.verifiedFacts.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section className="advisor-section confirmed-section"><h2>Counselor-confirmed facts</h2>{packet.counselorConfirmedFacts.length ? <ul>{packet.counselorConfirmedFacts.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="section-copy">No counselor confirmations recorded.</p>}</section>
          <section className="advisor-section unresolved-section"><h2>Unresolved evidence</h2><ul>{packet.unresolvedEvidence.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section className="advisor-section workload-section"><h2><BriefcaseBusiness /> Workload constraints</h2><dl className="packet-constraints"><div><dt>Unit cap</dt><dd>{packet.workloadConstraints.maxUnits} units</dd></div><div><dt>Work</dt><dd>{packet.workloadConstraints.weeklyWorkHours || 0} hr/week · advisory</dd></div><div><dt>Summer</dt><dd>{packet.workloadConstraints.summerEnrollment ? `${packet.workloadConstraints.summerCourseLimit} course max` : "Off"}</dd></div><div><dt>Target</dt><dd>{packet.workloadConstraints.transferTarget?.term ?? "Flexible"}</dd></div></dl></section>
          <section className="advisor-section"><h2>Semester milestones</h2><ul>{packet.milestones.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section className="advisor-section"><h2>Alternatives and consequences</h2><ul>{packet.alternatives.map((item) => <li key={item.routeId}><strong>{item.label}</strong> · {item.estimatedTransferTerm} · {item.consequence}</li>)}{packet.consequences.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section className="advisor-section"><h2>Questions for my counselor</h2><ol>{packet.questionsForCounselor.map((item) => <li key={item}>{item}</li>)}</ol></section>
          <section className="advisor-section"><h2>Source IDs</h2><div className="packet-sources">{packet.sourceIds.map((sourceId) => <Tag key={sourceId}>{sourceId}</Tag>)}</div></section>
        </div>
        <footer className="callout info advisor-boundary"><div className="callout-title"><ShieldCheck />Planning boundary</div><p>{packet.disclaimer}</p></footer>
      </article>
    </div>
  );
}
