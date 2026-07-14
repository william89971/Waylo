"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { RoadmapView } from "@/components/roadmap-view";
import { RouteSelector } from "@/components/route-selector";
import { programById } from "@/lib/academic-data";
import { useWorkspaceStore } from "@/lib/workspace-store";

export default function RoadmapPage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const plan = workspace.plan;
  const route = plan?.routes.find((item) => item.id === workspace.activeRouteId) ?? plan?.routes[0];
  const program = programById.get(workspace.profile.selectedPathwayId);
  return (
    <div className="page">
      <PageHeader title="Your semester-by-semester route" subtitle={`${program?.universityName ?? "Destination"} · ${program?.name ?? "Pathway"} ${program?.degree ?? ""}. Every course is sequenced before the route is displayed.`} action={<Link href="/what-if" className="button"><RefreshCw size={16} />Test a change</Link>} />
      {route ? <section className="panel" style={{ padding: 20, marginBottom: 18 }}><div className="title-row" style={{ marginBottom: 10 }}><div><h2 className="section-title">{route.label}</h2><p className="section-copy">Estimated transfer: {route.estimatedTransferTerm} · {route.totalPlannedUnits} planned units</p></div><span className="status confirmed"><span className="status-icon"><CheckCircle2 size={15} /></span>Sequence validated</span></div><RoadmapView route={route} /></section> : null}
      <div className="split">
        {plan ? <RouteSelector plan={plan} /> : null}
        <aside className="stack"><section className="callout warning"><div className="callout-title"><AlertTriangle size={20} />Evidence still needs review</div><p>A valid prerequisite sequence does not confirm every transfer articulation. Check the linked sources with a counselor.</p><Link href="/evidence" className="text-link">Inspect route evidence</Link></section><section className="callout info"><div className="callout-title">Next route check</div><p>Remove Calculus I to see Waylo recalculate the dependent Data Science sequence.</p><Link href="/what-if" className="button primary" style={{ width: "100%", marginTop: 12 }}>Open What-If <ArrowRight size={16} /></Link></section></aside>
      </div>
    </div>
  );
}
