"use client";

import Link from "next/link";
import { ArrowRight, Check, Route as RouteIcon, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { PageHeader, Status } from "@/components/ui";
import { RoadmapView } from "@/components/roadmap-view";
import { WayloCommandBar } from "@/components/waylo-command-bar";
import { UncertaintyActionCard } from "@/components/uncertainty-action-card";
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
        <div className="position-cell"><div><div className="position-label">Destination</div><div className="position-value">{program?.universityName}</div></div></div>
        <div className="position-cell"><div><div className="position-label">Estimated transfer</div><div className="position-value">{route?.estimatedTransferTerm ?? "Needs review"}</div></div></div>
        <div className="position-cell"><div><div className="on-track"><span className="status-icon" style={{ border: "1.5px solid var(--green)" }}><Check size={15} /></span>On track</div><div className="position-label" style={{ marginTop: 5 }}>{workspace.plan?.reviewItems.length || 0} open review item</div></div></div>
      </section>
      <WayloCommandBar showFallback={false} />
      <div className="overview-grid">
        <section className="panel roadmap-panel overview-roadmap">
          <div className="title-row roadmap-title"><div><span className="eyebrow">Current route</span><h2 className="section-title">{program?.universityName}: {program?.name} {program?.degree}</h2><p className="section-copy">{route?.label} · deterministic sequence validation complete</p></div><Link href="/roadmap" className="button small"><RouteIcon size={15} />Open roadmap</Link></div>
          {route ? <RoadmapView route={route} compact /> : null}
        </section>
        <aside className="overview-review-rail"><div className="callout info"><div className="callout-title"><ShieldCheck size={20} />Next step</div><p>Resolve or explicitly record the open Calculus I evidence question before relying on the match.</p><Link href="/profile" className="button primary">Review profile <ArrowRight size={16} /></Link></div><Status tone="warning" label={`${workspace.plan?.reviewItems.length || 0} unresolved evidence item`} /></aside>
      </div>
      <UncertaintyActionCard courseId="coc-math-211" />
    </div>
  );
}
