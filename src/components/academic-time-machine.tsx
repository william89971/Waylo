"use client";

import { Check, GitCompareArrows, Wrench } from "lucide-react";
import type { RouteCandidate, TimeMachineState } from "@/lib/domain";

interface AcademicTimeMachineProps {
  value: TimeMachineState;
  onChange(value: TimeMachineState): void;
  baseline: RouteCandidate;
  proposed?: RouteCandidate;
  repaired?: RouteCandidate;
}

export function AcademicTimeMachine({ value, onChange, baseline, proposed, repaired }: AcademicTimeMachineProps) {
  const stops = [
    { id: "baseline" as const, label: "Baseline", detail: baseline.estimatedTransferTerm, icon: Check, route: baseline },
    { id: "proposed" as const, label: "Proposed", detail: proposed ? `${proposed.valid ? "Valid" : "Rejected"} · ${proposed.estimatedTransferTerm}` : "Run a simulation first", icon: GitCompareArrows, route: proposed },
    { id: "repaired" as const, label: "Repaired", detail: repaired ? `${repaired.valid ? "Revalidated" : "Failed"} · ${repaired.estimatedTransferTerm}` : "No repair available", icon: Wrench, route: repaired },
  ];
  return (
    <div className="time-machine" role="group" aria-label="Academic Time Machine">
      <div className="time-machine-heading">
        <div><span className="workspace-kicker">Academic Time Machine</span><strong>Move between the saved route and unsaved outcomes</strong></div>
        <span className="time-machine-boundary">Only a confirmed valid route is saved</span>
      </div>
      <div className="time-machine-stops">
        {stops.map(({ id, label, detail, icon: Icon, route }) => (
          <button
            key={id}
            type="button"
            className={`time-stop ${value === id ? "active" : ""}`}
            aria-pressed={value === id}
            disabled={!route}
            title={!route ? detail : undefined}
            onClick={() => onChange(id)}
          >
            <span className="time-stop-icon"><Icon aria-hidden="true" /></span>
            <span><strong>{label}</strong><small>{detail}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}
