"use client";

import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";
import { PageHeader, Tag } from "@/components/ui";
import { RouteSelector } from "@/components/route-selector";
import { programById } from "@/lib/academic-data";
import { useWorkspaceStore } from "@/lib/workspace-store";

export default function ComparePage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const program = programById.get(workspace.profile.selectedPathwayId);
  return (
    <div className="page">
      <PageHeader title="Compare route tradeoffs" subtitle={`Three validated strategies for ${program?.universityName} ${program?.name}. Choose the route that best fits your time and workload.`} />
      <div className="three-column" style={{ marginBottom: 18 }}>
        {workspace.plan?.routes.map((route) => <section className="panel" style={{ padding: 18 }} key={route.id}><div className="cluster"><Scale size={20} color={route.strategy === "overlap" ? "var(--purple)" : route.strategy === "balanced" ? "var(--teal)" : "var(--blue)"} /><Tag tone={route.strategy === "overlap" ? "purple" : route.strategy === "balanced" ? "teal" : "default"}>{route.estimatedTransferTerm}</Tag></div><h2 className="section-title" style={{ marginTop: 14 }}>{route.label}</h2><p className="section-copy">{route.description}</p><div className="route-meta"><span>{route.totalPlannedUnits} units</span><span>{Math.round(route.overlapScore * 100)}% overlap score</span><span>{route.issues.length} blockers</span></div></section>)}
      </div>
      {workspace.plan ? <RouteSelector plan={workspace.plan} /> : null}
      <div className="title-row" style={{ marginTop: 18 }}><p className="section-copy">Route scores explain tradeoffs; they do not predict admission.</p><Link href="/roadmap" className="button primary">Open selected roadmap <ArrowRight size={16} /></Link></div>
    </div>
  );
}
