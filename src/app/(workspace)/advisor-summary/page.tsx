"use client";

import { Printer, ShieldCheck } from "lucide-react";
import { PageHeader, Status } from "@/components/ui";
import { buildAdvisorSummary } from "@/lib/advisor-summary";
import { useWorkspaceStore } from "@/lib/workspace-store";

export default function AdvisorSummaryPage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  if (!workspace.plan) return <div className="page"><PageHeader title="Advisor summary" /><div className="empty-state panel"><div><h2>No validated plan yet</h2><p>Choose a supported pathway before creating a summary.</p></div></div></div>;
  const summary = buildAdvisorSummary(workspace.profile, workspace.plan);
  return <div className="page"><PageHeader title="Advisor summary" subtitle="A printable conversation guide that separates validated route facts from review items." action={<button className="button primary no-print" type="button" onClick={() => window.print()}><Printer size={16} />Print summary</button>} /><article className="panel advisor-sheet"><header className="advisor-header"><div><div className="landing-brand" style={{ fontSize: 30 }}>Waylo</div><p className="section-copy">Find your way through college.</p></div><div style={{ textAlign: "right" }}><strong>{workspace.profile.name}</strong><div className="section-copy">Prepared from local workspace data</div><Status tone="warning" label="Counselor review required" /></div></header><div className="advisor-grid"><section className="advisor-section"><h2>Current position</h2><p className="section-copy">{summary.currentPosition}</p></section><section className="advisor-section"><h2>Destination and route</h2><p className="section-copy"><strong>{summary.destination}</strong><br />{summary.routeStrategy} · estimated {summary.estimatedTransferTerm}</p></section><section className="advisor-section"><h2>Verified route facts</h2><ul>{summary.verifiedFacts.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="advisor-section"><h2>Items to review</h2><ul>{summary.reviewItems.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="advisor-section"><h2>Semester milestones</h2><ul>{summary.milestones.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="advisor-section"><h2>Questions for my counselor</h2><ul>{summary.questionsForCounselor.map((item) => <li key={item}>{item}</li>)}</ul></section></div><footer className="callout info" style={{ marginTop: 24 }}><div className="callout-title"><ShieldCheck size={19} />Planning boundary</div><p>{summary.disclaimer}</p></footer></article></div>;
}
