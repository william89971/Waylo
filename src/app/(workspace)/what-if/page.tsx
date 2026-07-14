"use client";

import { ArrowRight, GitCompareArrows, ShieldCheck } from "lucide-react";
import { PageHeader, Status } from "@/components/ui";
import { RoadmapView } from "@/components/roadmap-view";
import { WayloCommandBar } from "@/components/waylo-command-bar";
import { UncertaintyActionCard } from "@/components/uncertainty-action-card";
import { useWorkspaceStore } from "@/lib/workspace-store";

export default function WhatIfPage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const simulation = useWorkspaceStore((state) => state.simulationResult);
  const baseline = simulation?.baselineRoute ?? workspace.plan?.routes.find((route) => route.id === workspace.activeRouteId) ?? workspace.plan?.routes[0];
  const simulated = simulation?.simulatedRoute;
  return (
    <div className="page">
      <PageHeader title="See what changes before you change your plan." subtitle="Describe a detour or use the same bounded visual controls. Nothing is saved until you confirm the engine result." />
      <WayloCommandBar />
      <div className="whatif-comparison">
        <section className="panel roadmap-panel"><div className="comparison-heading"><div><span className="eyebrow">Before</span><h2>Current route</h2></div>{baseline ? <Status tone="confirmed" label={baseline.estimatedTransferTerm} /> : null}</div>{baseline ? <RoadmapView route={baseline} compact /> : null}</section>
        <span className="comparison-arrow" aria-hidden="true"><ArrowRight /></span>
        <section className={`panel roadmap-panel ${simulated ? "recalculated" : "pending"}`}><div className="comparison-heading"><div><span className="eyebrow">After</span><h2>Recalculated route</h2></div>{simulated ? <Status tone={simulated.valid ? "confirmed" : "blocker"} label={simulated.estimatedTransferTerm} /> : null}</div>{simulated ? <RoadmapView route={simulated} compact /> : <div className="empty-state"><div><GitCompareArrows size={30} /><h2>Preview a route change</h2><p>The resulting course moves, target status, and blockers appear here after simulation.</p></div></div>}</section>
      </div>
      <div className="whatif-footer-grid"><section className="callout info"><div className="callout-title"><ShieldCheck size={20} />Deterministic boundary</div><p>Prerequisites, unit limits, offerings, duplicate credit, and target satisfaction are recalculated from the dataset—not accepted from model output.</p></section><UncertaintyActionCard courseId="coc-math-211" compact /></div>
    </div>
  );
}
