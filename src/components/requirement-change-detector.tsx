"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, FileDiff, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequirementChangeComparisonSchema, type RequirementChangeComparison } from "@/lib/domain";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function RequirementChangeDetector() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const [comparison, setComparison] = useState<RequirementChangeComparison>();
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const activeRoute = workspace.plan?.routes.find((route) => route.id === workspace.activeRouteId) ?? workspace.plan?.routes[0];

  async function compare() {
    setStatus("loading");
    setComparison(undefined);
    try {
      const response = await fetch("/api/requirement-changes/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathwayId: workspace.profile.selectedPathwayId, activeRoute }),
      });
      if (!response.ok) throw new Error("Controlled comparison unavailable");
      setComparison(RequirementChangeComparisonSchema.parse(await response.json()));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="panel requirement-change-detector" aria-labelledby="requirement-change-title">
      <div className="requirement-change-heading">
        <span className="requirement-change-icon"><FileDiff aria-hidden="true" /></span>
        <div>
          <span className="workspace-kicker">Gated P1 evaluation</span>
          <h2 id="requirement-change-title">Requirement Change Detector</h2>
          <p>Compare a versioned requirement snapshot and mark affected route segments without turning an unverified difference into an academic fact.</p>
        </div>
        <span className="fixture-label">Controlled fixture</span>
      </div>

      {status === "idle" ? <div className="requirement-change-empty"><ShieldCheck /><div><strong>No real-world change claim is loaded</strong><p>Run the controlled fixture to demonstrate version comparison safely.</p></div></div> : null}
      {status === "loading" ? <div className="requirement-change-loading" aria-live="polite"><RefreshCw className="spin" /><div><strong>Comparing version fingerprints</strong><span>Checking supported requirements and the active validated route…</span></div></div> : null}
      {status === "error" ? <div className="requirement-change-error" role="alert"><AlertTriangle /><div><strong>Comparison unavailable</strong><p>No route was marked stale. Try the controlled fixture again.</p></div></div> : null}

      {comparison ? <div className="requirement-change-result">
        <div className="version-rail" aria-label="Compared requirement versions">
          <div><span>Current dataset</span><strong>{comparison.fromVersion.academicYear}</strong><small>{comparison.fromVersion.fingerprint}</small></div>
          <ArrowRight aria-hidden="true" />
          <div><span>Comparison target</span><strong>{comparison.toVersion.academicYear}</strong><small>{comparison.toVersion.fingerprint}</small></div>
        </div>
        {comparison.changes.map((change) => <article className="requirement-change-row" key={change.id}><div><span className="fixture-label proposed">Proposed review</span><strong>{change.summary}</strong></div><small>Requirement IDs: {change.affectedRequirementIds.join(", ")}</small></article>)}
        <div className="affected-segments">
          <strong>Affected segments in the current route</strong>
          {comparison.affectedSegments.length ? comparison.affectedSegments.map((segment) => <div key={`${segment.routeId}-${segment.courseId}`}><span>{segment.courseCode}</span><span>{segment.term}</span><span>Review proposed</span></div>) : <p>No current route segment is affected by this controlled difference.</p>}
        </div>
        <p className="requirement-change-disclaimer">{comparison.disclaimer}</p>
      </div> : null}

      <div className="requirement-change-actions"><Button variant="outline" disabled={status === "loading"} onClick={() => void compare()}>{status === "loading" ? <RefreshCw className="spin" data-icon="inline-start" /> : <FileDiff data-icon="inline-start" />}Compare controlled versions</Button></div>
    </section>
  );
}
