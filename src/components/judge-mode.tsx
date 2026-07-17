"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Check, Database, Gauge, GitBranch, Microscope, Route, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { JudgeModeSnapshotSchema, type JudgeModeSnapshot } from "@/lib/domain";
import { Status } from "@/components/ui";

export function JudgeMode() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<JudgeModeSnapshot>();
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/judge-snapshot", { cache: "no-store" });
      if (!response.ok) throw new Error("Technical snapshot unavailable.");
      setSnapshot(JudgeModeSnapshotSchema.parse(await response.json()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Technical snapshot unavailable.");
    }
  }, []);

  useEffect(() => {
    const openJudgeMode = () => {
      setOpen(true);
      void load();
    };
    window.addEventListener("waylo:open-judge-mode", openJudgeMode);
    if (new URLSearchParams(window.location.search).get("judge") === "1") {
      queueMicrotask(() => {
        setOpen(true);
        void load();
      });
    }
    return () => window.removeEventListener("waylo:open-judge-mode", openJudgeMode);
  }, [load]);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next && !snapshot) void load();
  }

  return (
    <>
      <Button className="judge-trigger" size="sm" variant="outline" onClick={() => changeOpen(true)}><Microscope data-icon="inline-start" />Judge mode</Button>
      <Sheet open={open} onOpenChange={changeOpen}>
        <SheetContent className="judge-sheet sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Waylo technical inspector</SheetTitle>
            <SheetDescription>Sanitized runtime facts, deterministic planning boundaries, and build-attested verification only.</SheetDescription>
          </SheetHeader>
          {!snapshot && !error ? <div className="judge-loading" aria-label="Loading technical snapshot"><Skeleton className="h-24 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-28 w-full" /></div> : null}
          {error ? <div className="judge-error"><strong>Inspector unavailable</strong><p>{error}</p><Button variant="outline" onClick={() => void load()}>Try again</Button></div> : null}
          {snapshot ? <div className="judge-content">
            <section className="judge-hero">
              <div><span className="workspace-kicker">Execution</span><h3>{snapshot.execution.model}</h3><p>{snapshot.execution.label}</p></div>
              <Status tone={snapshot.execution.mode === "live" ? "confirmed" : "planned"} label={`${snapshot.execution.mode} · ${snapshot.execution.reasoningEffort}`} />
            </section>
            <section className="judge-metrics" aria-label="Planning metrics">
              <div><Activity /><strong>{snapshot.planning.candidateCount}</strong><span>candidate outcomes</span></div>
              <div><Check /><strong>{snapshot.planning.acceptedCount}</strong><span>accepted strategies</span></div>
              <div><Wrench /><strong>{snapshot.planning.repairCount}</strong><span>repair attempt</span></div>
              <div><Database /><strong>{snapshot.evidence.sourceCount}</strong><span>source records</span></div>
            </section>
            <section className="judge-section">
              <div className="judge-section-title"><Check /><div><strong>Structured interpretation</strong><span>{snapshot.execution.schemaName}</span></div></div>
              <dl><div><dt>Schema validated</dt><dd>{snapshot.execution.schemaValidated ? "Yes" : "No"}</dd></div><div><dt>Search cap</dt><dd>{snapshot.planning.searchCap}</dd></div><div><dt>Human gate</dt><dd>Required</dd></div></dl>
            </section>
            <section className="judge-section">
              <div className="judge-section-title"><ShieldCheck /><div><strong>Deterministic validation</strong><span>{snapshot.planning.rejectedCount} rejected outcomes retained for inspection</span></div></div>
              <ul>{snapshot.planning.validationRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
            </section>
            <section className="judge-section">
              <div className="judge-section-title"><Database /><div><strong>Bounded academic coverage</strong><span>{snapshot.evidence.pathwayCount} pathways across {snapshot.evidence.destinationCount} destinations</span></div></div>
              <dl><div><dt>Verified sources</dt><dd>{snapshot.evidence.verifiedCount}</dd></div><div><dt>Review sources</dt><dd>{snapshot.evidence.reviewCount}</dd></div><div><dt>Last source check</dt><dd>{snapshot.evidence.lastVerifiedAt}</dd></div></dl>
            </section>
            <section className="judge-section">
              <div className="judge-section-title"><Gauge /><div><strong>Safe timing</strong><span>No prompts, transcripts, profile contents, or model responses</span></div></div>
              <dl><div><dt>Total</dt><dd>{snapshot.latency.totalMs} ms</dd></div><div><dt>Planning</dt><dd>{snapshot.latency.planningMs} ms</dd></div><div><dt>Validation</dt><dd>{snapshot.latency.validationMs} ms</dd></div></dl>
            </section>
            <section className="judge-section">
              <div className="judge-section-title"><GitBranch /><div><strong>Architecture flow</strong><span>{snapshot.evidence.dataVersion}</span></div></div>
              <div className="architecture-flow">{snapshot.architecture.map((step, index) => <span key={step}><b>{index + 1}</b>{step}{index < snapshot.architecture.length - 1 ? <Route aria-hidden="true" /> : null}</span>)}</div>
            </section>
            <section className={`build-attestation ${snapshot.build.verified ? "verified" : "stale"}`}>
              <strong>{snapshot.build.label}</strong>
              <span>Runtime commit: {snapshot.build.commit.slice(0, 12)}</span>
              <p>Test claims appear as verified only when the manifest matches the deployed commit.</p>
            </section>
          </div> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
