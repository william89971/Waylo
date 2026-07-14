"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, FileText, RefreshCw, Route as RouteIcon, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { PageHeader, Status } from "@/components/ui";
import { RoadmapView } from "@/components/roadmap-view";
import { programById } from "@/lib/academic-data";
import { useWorkspaceStore } from "@/lib/workspace-store";

export default function OverviewPage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const route = workspace.plan?.routes.find((item) => item.id === workspace.activeRouteId) ?? workspace.plan?.routes[0];
  const program = programById.get(workspace.profile.selectedPathwayId);
  return (
    <div className="page">
      <PageHeader title="Know where you are and what comes next." subtitle="Your route is built from current evidence, prerequisite order, and the constraints you chose." />
      <section className="panel current-position" aria-label="Current academic position">
        <div className="position-cell"><BrandMark /><div><div className="position-label">Current position</div><div className="position-value">{workspace.profile.originInstitutionName}</div></div></div>
        <div className="position-cell"><div><div className="position-label">Destination</div><div className="destination-dots"><span className="destination-dot">Cognitive Science</span><span className="destination-dot data">Data Science</span></div></div></div>
        <div className="position-cell"><div><div className="position-label">Estimated transfer</div><div className="position-value">{route?.estimatedTransferTerm ?? "Needs review"}</div></div></div>
        <div className="position-cell"><div><div className="on-track"><span className="status-icon" style={{ border: "1.5px solid var(--green)" }}><Check size={15} /></span>On track</div><div className="position-label" style={{ marginTop: 5 }}>{workspace.plan?.reviewItems.length || 1} item to verify</div></div></div>
      </section>
      <div className="split">
        <div className="stack">
          <section className="panel" style={{ padding: 20 }}>
            <div className="title-row" style={{ marginBottom: 4 }}>
              <div><h2 className="section-title">{program?.universityName}: {program?.name} {program?.degree}</h2><p className="section-copy">{route?.label} · sequence checked against the Waylo demonstration dataset</p></div>
              <div className="cluster"><Link href="/roadmap" className="button small"><RouteIcon size={15} />Open roadmap</Link><Link href="/what-if" className="button small"><RefreshCw size={15} />Recalculate</Link></div>
            </div>
            {route ? <RoadmapView route={route} compact /> : null}
          </section>
          <section className="panel" style={{ padding: 20 }}>
            <div className="title-row">
              <div className="cluster"><span className="status-icon" style={{ background: "var(--purple-soft)", color: "var(--purple)" }}><RouteIcon size={16} /></span><div><h2 className="section-title">Alternate path</h2><p className="section-copy">See what changes before you change your plan.</p></div></div>
              <Link className="button" href="/what-if">See alternate path <ArrowRight size={16} /></Link>
            </div>
          </section>
        </div>
        <aside className="stack" aria-label="Next steps and review items">
          <section className="callout info"><div className="callout-title"><FileText size={20} color="var(--blue)" />Next step</div><p>Review the Calculus I identity and articulation before relying on it for pathway coverage.</p><Link href="/profile" className="button primary" style={{ width: "100%", marginTop: 14 }}>Review now <ArrowRight size={16} /></Link></section>
          <section className="callout warning"><div className="callout-title"><AlertTriangle size={20} color="var(--amber)" />Calculus I needs review</div><p>The course identity can be confirmed here; its transfer articulation should still be checked in ASSIST.</p><Link href="/evidence" className="text-link">Review evidence</Link></section>
          <section className="callout"><div className="callout-title"><ShieldCheck size={20} color="var(--blue)" />Counselor verification required</div><p>Waylo highlights questions so you can review a clearer plan with your counselor.</p><Status tone="warning" label={`${workspace.plan?.reviewItems.length || 1} open review item`} /></section>
        </aside>
      </div>
    </div>
  );
}
