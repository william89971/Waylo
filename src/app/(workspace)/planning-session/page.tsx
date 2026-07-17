"use client";

import { useState } from "react";
import { AlertTriangle, Check, Circle, RotateCcw, ShieldCheck, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { PageHeader, Status } from "@/components/ui";
import { evidence, programById } from "@/lib/academic-data";
import { OperationalTraceEventSchema, type OperationalTraceEvent } from "@/lib/domain";
import { useWorkspaceStore } from "@/lib/workspace-store";

function EventIcon({ event }: { event: OperationalTraceEvent }) {
  if (event.status === "rejected") return <span className="status-icon rejected"><X size={15} /></span>;
  if (event.status === "review") return <span className="status-icon review"><AlertTriangle size={15} /></span>;
  return <span className="status-icon"><Check size={15} /></span>;
}

export default function PlanningSessionPage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const [events, setEvents] = useState(workspace.operationalTrace);
  const [running, setRunning] = useState(false);
  const reduceMotion = useReducedMotion();
  const program = programById.get(workspace.profile.selectedPathwayId);
  async function run(mode: "seeded" | "live") {
    if (!workspace.plan) return;
    setRunning(true); setEvents([]);
    try {
      const response = await fetch("/api/planning-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, pathwayId: workspace.profile.selectedPathwayId, activeRouteId: workspace.activeRouteId }) });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        if (mode === "live" && payload.seededModeAvailable) { await run("seeded"); return; }
        throw new Error("Planning session unavailable");
      }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) { const { done, value } = await reader.read(); buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done }); const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; for (const line of lines) if (line.trim()) { const event = OperationalTraceEventSchema.parse(JSON.parse(line)); setEvents((current) => [...current, event]); if (mode === "seeded" && !reduceMotion) await new Promise((resolve) => setTimeout(resolve, 120)); } if (done) break; }
    } catch { setEvents([{ id: "local-failure", stage: "review", label: "Planning session unavailable", detail: "The validated workspace is still safe. Try seeded mode again.", status: "review", evidenceIds: [] }]); }
    finally { setRunning(false); }
  }
  return (
    <div className="page">
      <PageHeader title="Transparent planning trace" subtitle="Follow source IDs, candidate outcomes, deterministic rejection reasons, one bounded repair, and final validation—without exposing private reasoning." action={<button className="button primary" type="button" disabled={running} onClick={() => run("seeded")}><RotateCcw />{running ? "Replaying…" : "Replay GPT-5.6 demonstration"}</button>} />
      <p className="recorded-result-label trace-recorded-label">Recorded GPT-5.6 demo result. This seeded trace makes no OpenAI request.</p>
      <div className="trace-boundary"><ShieldCheck size={18} /><div><strong>Operational facts only</strong><p>This trace reports application events and validator outcomes. It never exposes chain-of-thought, prompts, transcript content, or model responses.</p></div></div>
      <div className="planning-layout refined">
        <aside className="panel source-register"><div className="source-register-header"><h2 className="section-title">Sources in scope</h2><p className="section-copy">Official pages plus explicit ASSIST review records.</p></div>{evidence.filter((item) => !item.pathwayId || item.pathwayId === workspace.profile.selectedPathwayId).slice(0, 6).map((item) => <div className="source-card" key={item.id}><div className="source-title">{item.title}</div><div className="source-meta"><code>{item.id}</code><span>{item.effectiveYear}</span><Status tone={item.status === "verified" ? "confirmed" : "warning"} label={item.status} /></div></div>)}</aside>
        <section className="panel trace-panel"><div className="trace-header"><div><span className="eyebrow">Sanitized event stream</span><h2 className="section-title">{program?.universityName} {program?.name}</h2></div>{running ? <Status tone="planned" label="Working" /> : <Status tone="confirmed" label="Trace complete" />}</div><div className="event-list">{events.length ? events.map((event, index) => <motion.div layout={!reduceMotion} className="event" key={event.id}><span className="event-time">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }) : String(index + 1).padStart(2, "0")}</span><EventIcon event={event} /><div className="event-detail"><div className="event-label-row"><strong>{event.label}</strong><span className="event-stage">{event.stage}{event.durationMs !== undefined ? ` · ${event.durationMs} ms` : ""}</span></div><span>{event.detail}</span>{event.evidenceIds.length ? <code>{event.evidenceIds.join(" · ")}</code> : null}{event.outcomeId ? <code>{event.outcomeId}</code> : null}</div>{event.count !== undefined ? <span className="event-count">{event.count}</span> : null}</motion.div>) : <div className="empty-state"><div><Circle /><h2>{running ? "Building the trace…" : "Ready to start"}</h2><p>Bounded application events appear as each step completes.</p></div></div>}</div></section>
        <aside className="stack"><section className="callout info"><div className="callout-title"><ShieldCheck size={20} />Validation boundary</div><p>Model proposals cannot bypass prerequisite, unit, evidence, or coverage validation.</p></section><section className="callout warning"><div className="callout-title"><AlertTriangle size={20} />Recorded judging path</div><p>The public judge flow replays a complete, labeled result. Live GPT-5.6 remains an authenticated server integration, not a judge-facing dependency.</p></section></aside>
      </div>
    </div>
  );
}
