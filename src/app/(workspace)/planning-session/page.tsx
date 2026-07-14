"use client";

import { useState } from "react";
import { AlertTriangle, Check, Circle, Play, RotateCcw, ShieldCheck, X } from "lucide-react";
import { PageHeader, Status } from "@/components/ui";
import { evidence, programById } from "@/lib/academic-data";
import { PlanningEventSchema, type PlanningEvent } from "@/lib/domain";
import { useWorkspaceStore } from "@/lib/workspace-store";

function EventIcon({ event }: { event: PlanningEvent }) {
  if (event.status === "rejected") return <span className="status-icon" style={{ background: "var(--red-soft)", color: "var(--red)" }}><X size={15} /></span>;
  if (event.status === "review") return <span className="status-icon" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}><AlertTriangle size={15} /></span>;
  return <span className="status-icon"><Check size={15} /></span>;
}

export default function PlanningSessionPage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const [events, setEvents] = useState(workspace.planningEvents);
  const [running, setRunning] = useState(false);
  const program = programById.get(workspace.profile.selectedPathwayId);
  async function run(mode: "seeded" | "live") {
    if (!workspace.plan) return;
    setRunning(true); setEvents([]);
    try {
      const response = await fetch("/api/planning-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, profile: workspace.profile, plan: workspace.plan }) });
      if (!response.ok || !response.body) throw new Error("Planning session unavailable");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) { const { done, value } = await reader.read(); buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done }); const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; for (const line of lines) if (line.trim()) { const event = PlanningEventSchema.parse(JSON.parse(line)); setEvents((current) => [...current, event]); } if (done) break; }
    } catch { setEvents([{ id: "local-failure", type: "warning", label: "Planning session unavailable", detail: "The validated workspace is still safe. Try seeded mode again.", status: "review" }]); }
    finally { setRunning(false); }
  }
  return <div className="page"><PageHeader title="Guided planning session" subtitle="Watch Waylo read evidence, reject invalid sequencing, and build routes. GPT can explain; the deterministic engine decides validity." action={<div className="cluster"><button className="button" type="button" disabled={running} onClick={() => run("seeded")}><RotateCcw size={15} />Replay seeded</button><button className="button primary" type="button" disabled={running} onClick={() => run("live")}><Play size={15} />{running ? "Running…" : "Try live GPT-5.6"}</button></div>} /><div className="planning-layout"><aside className="panel"><div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}><h2 className="section-title">Sources in scope</h2><p className="section-copy">Official pages plus an explicit ASSIST review item.</p></div>{evidence.filter((item) => !item.pathwayId || item.pathwayId === workspace.profile.selectedPathwayId).slice(0, 5).map((item) => <div className="source-card" key={item.id}><div className="source-title">{item.title}</div><div className="source-meta">{item.effectiveYear} · {item.status}</div></div>)}</aside><section className="panel"><div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}><div className="title-row"><div><h2 className="section-title">Planning trace</h2><p className="section-copy">{program?.universityName} {program?.name}</p></div>{running ? <Status tone="planned" label="Working" /> : <Status tone="confirmed" label="Trace complete" />}</div></div><div className="event-list">{events.length ? events.map((event, index) => <div className="event" key={event.id}><span className="event-time">{String(index + 1).padStart(2, "0")}</span><EventIcon event={event} /><div className="event-detail"><strong>{event.label}</strong><span>{event.detail}</span></div></div>) : <div className="empty-state" style={{ minHeight: 300 }}><div><Circle size={30} /><h2>{running ? "Building your trace…" : "Ready to start"}</h2><p>Events stream here as each bounded planning step completes.</p></div></div>}</div></section><aside className="stack"><section className="callout info"><div className="callout-title"><ShieldCheck size={20} />Validation boundary</div><p>Model-proposed route changes cannot bypass prerequisite, unit, evidence, or coverage validation.</p></section><section className="callout warning"><div className="callout-title"><AlertTriangle size={20} />Live mode needs your key</div><p>If no server-side key is configured, the stream says so and keeps the seeded route. Waylo never displays or logs the key.</p></section></aside></div></div>;
}
