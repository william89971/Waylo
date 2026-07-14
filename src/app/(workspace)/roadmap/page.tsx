"use client";

import Link from "next/link";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { RoadmapView } from "@/components/roadmap-view";
import { RouteSelector } from "@/components/route-selector";
import { WayloCommandBar } from "@/components/waylo-command-bar";
import { UncertaintyActionCard } from "@/components/uncertainty-action-card";
import { programById } from "@/lib/academic-data";
import { useWorkspaceStore } from "@/lib/workspace-store";

export default function RoadmapPage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const plan = workspace.plan;
  const route = plan?.routes.find((item) => item.id === workspace.activeRouteId) ?? plan?.routes[0];
  const program = programById.get(workspace.profile.selectedPathwayId);
  return (
    <div className="page">
      <PageHeader title="Your semester-by-semester route" subtitle={`${program?.universityName ?? "Destination"} · ${program?.name ?? "Pathway"} ${program?.degree ?? ""} — every course is sequenced before the route is displayed.`} action={<Link href="/what-if" className="button"><RefreshCw size={16} />Open What-If</Link>} />
      <WayloCommandBar />
      {route ? <section className="panel roadmap-panel"><div className="title-row roadmap-title"><div><span className="eyebrow">Active route</span><h2 className="section-title">{route.label}</h2><p className="section-copy">Estimated transfer: {route.estimatedTransferTerm} · {route.totalPlannedUnits} planned units</p></div><span className="status confirmed"><span className="status-icon"><CheckCircle2 size={15} /></span>Sequence validated</span></div><RoadmapView route={route} /></section> : null}
      <div className="roadmap-support-grid">
        {plan ? <RouteSelector plan={plan} /> : null}
        <UncertaintyActionCard courseId="coc-math-211" compact />
      </div>
    </div>
  );
}
