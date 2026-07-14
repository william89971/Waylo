"use client";

import { ArrowRight, Check } from "lucide-react";
import type { PlanResult } from "@/lib/domain";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function RouteSelector({ plan }: { plan: PlanResult }) {
  const activeRouteId = useWorkspaceStore((state) => state.workspace.activeRouteId);
  const selectRoute = useWorkspaceStore((state) => state.selectRoute);
  return (
    <div className="panel pathway-group">
      {plan.routes.map((route) => (
        <div className={`route-row ${route.id === activeRouteId ? "selected" : ""}`} key={route.id}>
          <div>
            <div className="route-name">{route.label}</div>
            <div className="route-description">{route.description}</div>
            <div className="route-meta">
              <span><strong>{route.estimatedTransferTerm}</strong> estimated transfer</span>
              <span>{route.totalPlannedUnits} planned units</span>
              <span>{Math.round(route.requirementCoverage * 100)}% modeled preparation</span>
              <span>{route.valid ? <><Check size={13} /> Validated sequence</> : "Needs changes"}</span>
            </div>
          </div>
          <button className={`button small ${route.id === activeRouteId ? "primary" : ""}`} type="button" onClick={() => selectRoute(route.id)}>
            {route.id === activeRouteId ? "Selected" : "Choose route"}<ArrowRight size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
