"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ArrowRight, Check, Command, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Status } from "@/components/ui";
import { PlanCommandInterpretationSchema, type PlanChange } from "@/lib/domain";
import { courseById } from "@/lib/academic-data";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { SimulationResult } from "@/lib/simulation-engine";

const SAMPLE_COMMAND = "Remove Linear Algebra, use summer classes if necessary, and keep my Fall 2028 transfer target.";

function changeLabel(change: PlanChange) {
  if (change.type === "defer_course") return `Recalculate ${change.courseCode} outside its current route position`;
  if (change.type === "set_summer_enrollment") return `${change.enabled ? "Allow" : "Avoid"} summer terms`;
  return `Set transfer target to ${change.term}`;
}

export function WayloCommandBar({ showFallback = true }: { showFallback?: boolean }) {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const simulateChanges = useWorkspaceStore((state) => state.simulateChanges);
  const clearSimulation = useWorkspaceStore((state) => state.clearSimulation);
  const applySimulation = useWorkspaceStore((state) => state.applySimulation);
  const reduceMotion = useReducedMotion();
  const [command, setCommand] = useState(SAMPLE_COMMAND);
  const [mode, setMode] = useState<"seeded" | "live">(workspace.mode);
  const [interpretation, setInterpretation] = useState<ReturnType<typeof PlanCommandInterpretationSchema.parse>>();
  const [result, setResult] = useState<SimulationResult>();
  const [status, setStatus] = useState<"idle" | "parsing" | "preview" | "simulated" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const activeRoute = workspace.plan?.routes.find((route) => route.id === workspace.activeRouteId) ?? workspace.plan?.routes[0];
  const routeCourses = useMemo(() => activeRoute?.terms.flatMap((term) => term.courses) ?? [], [activeRoute]);
  const [fallbackCourse, setFallbackCourse] = useState("coc-math-214");
  const [fallbackSummer, setFallbackSummer] = useState(workspace.profile.summerEnrollment);
  const [fallbackTarget, setFallbackTarget] = useState("Fall 2028");

  function reset() {
    setInterpretation(undefined); setResult(undefined); setStatus("idle"); setMessage(""); setAcknowledged(false); clearSimulation();
  }

  async function interpret(selectedMode = mode) {
    setStatus("parsing"); setMessage(""); setResult(undefined); clearSimulation();
    try {
      const response = await fetch("/api/plan-commands/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: selectedMode, command, selectedPathwayId: workspace.profile.selectedPathwayId, activeRouteId: activeRoute?.id }) });
      const payload = await response.json();
      if (!response.ok) {
        if (payload.seededModeAvailable) setMessage(`${payload.message} Use the deterministic seeded parser to continue.`);
        throw new Error(payload.message ?? "Waylo could not interpret that request.");
      }
      const parsed = PlanCommandInterpretationSchema.parse(payload);
      setInterpretation(parsed); setStatus("preview");
    } catch (error) {
      setStatus("error");
      setMessage((current) => current || (error instanceof Error ? error.message : "Waylo could not interpret that request."));
    }
  }

  function runSimulation(changes = interpretation?.changes) {
    if (!changes?.length) return;
    const next = simulateChanges(changes);
    setResult(next); setStatus("simulated"); setAcknowledged(false);
  }

  function runFallback() {
    const course = courseById.get(fallbackCourse);
    const changes: PlanChange[] = [
      { id: `defer-${fallbackCourse}`, type: "defer_course", courseId: fallbackCourse, courseCode: course?.code ?? fallbackCourse, courseTitle: course?.title ?? fallbackCourse },
      { id: fallbackSummer ? "summer-on" : "summer-off", type: "set_summer_enrollment", enabled: fallbackSummer },
      { id: "transfer-target", type: "set_transfer_target", term: fallbackTarget },
    ];
    setInterpretation(PlanCommandInterpretationSchema.parse({ summary: "Visual controls produced the same bounded changes as the command parser.", changes, confidence: 1, clarificationItems: [], source: "seeded" }));
    runSimulation(changes);
  }

  function confirm() {
    if (!result) return;
    const applied = applySimulation(acknowledged);
    if (applied) setStatus("saved");
  }

  return (
    <section className="command-shell" aria-label="Waylo plan command">
      <div className="command-heading"><span className="command-mark"><Command size={18} /></span><div><span className="eyebrow">Plan command</span><h2>Describe a detour in plain language</h2></div><span className={`mode-pill ${mode}`}>{mode === "live" ? "Live GPT-5.6" : "Seeded parser"}</span></div>
      <div className="command-input-row">
        <Textarea aria-label="Describe a plan change" value={command} onChange={(event) => { setCommand(event.target.value); if (status !== "idle") reset(); }} className="command-input" />
        <Button className="command-submit" disabled={!command.trim() || status === "parsing"} onClick={() => interpret()}>{status === "parsing" ? <LoaderCircle className="spin" /> : <Sparkles />}Preview changes</Button>
      </div>
      <div className="command-meta"><span>GPT proposes normalized changes. Waylo’s deterministic engine validates the route.</span><label>Interpreter<select className="compact-select" aria-label="Command interpreter" value={mode} onChange={(event) => setMode(event.target.value as "seeded" | "live")}><option value="seeded">Seeded</option><option value="live">Live GPT-5.6</option></select></label></div>

      <AnimatePresence mode="wait">
        {status === "error" ? <motion.div className="command-state error-state" initial={reduceMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><AlertTriangle size={19} /><div><strong>Interpretation needs attention</strong><p>{message}</p></div><Button variant="outline" onClick={() => { setMode("seeded"); void interpret("seeded"); }}>Use seeded parser</Button></motion.div> : null}
        {interpretation && status === "preview" ? <motion.div className="command-state preview-state" key="preview" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><div className="state-heading"><div><span className="step-kicker">1 · Structured preview</span><strong>{interpretation.summary}</strong></div><Status tone={interpretation.clarificationItems.length ? "warning" : "confirmed"} label={`${Math.round(interpretation.confidence * 100)}% confidence`} /></div><div className="change-list">{interpretation.changes.map((change) => <div className="change-row" key={change.id}><Check size={15} />{changeLabel(change)}</div>)}</div>{interpretation.clarificationItems.map((item) => <p className="clarification" key={item}>{item}</p>)}<div className="state-actions"><Button variant="outline" onClick={reset}>Edit request</Button><Button disabled={!interpretation.changes.length || interpretation.clarificationItems.length > 0} onClick={() => runSimulation()}>Run deterministic simulation <ArrowRight /></Button></div></motion.div> : null}
        {result && (status === "simulated" || status === "saved") ? <motion.div className="command-state simulation-state" key="simulation" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><div className="state-heading"><div><span className="step-kicker">2 · Engine result</span><strong>{status === "saved" ? "Confirmed plan saved" : "Review the before-and-after result"}</strong></div><Status tone={result.delta.valid ? result.delta.targetSatisfied === false ? "warning" : "confirmed" : "blocker"} label={result.delta.valid ? result.delta.targetSatisfied === false ? "Valid · target missed" : "Valid route" : "Hard-invalid"} /></div><div className="before-after"><div><span>Before</span><strong>{result.delta.baselineTransferTerm}</strong></div><ArrowRight size={20} /><div><span>After</span><strong>{result.delta.simulatedTransferTerm}</strong></div><div className="impact-count"><span>Course moves</span><strong>{result.delta.courseMoves.length}</strong></div></div><p className="simulation-explanation">{result.delta.explanation}</p>{result.delta.courseMoves.slice(0, 4).map((move) => <div className="move-row" key={move.courseId}><strong>{move.code}</strong><span>{move.fromTerm ?? "Not scheduled"} → {move.toTerm ?? "Not scheduled"}</span></div>)}{result.delta.acknowledgmentRequired && status !== "saved" ? <label className="acknowledge-row"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span>I understand this valid route misses my {result.delta.targetTerm} target and finishes {result.delta.simulatedTransferTerm}.</span></label> : null}<div className="state-actions"><Button variant="outline" onClick={reset}><RotateCcw />Start over</Button>{status === "saved" ? <Status tone="confirmed" label="Normalized route saved" /> : <Button disabled={!result.delta.valid || (result.delta.acknowledgmentRequired && !acknowledged)} onClick={confirm}>Confirm and save plan</Button>}</div></motion.div> : null}
      </AnimatePresence>

      {showFallback ? <details className="fallback-controls"><summary>Use visual what-if controls</summary><div className="fallback-grid"><label>Course to move<select className="field" value={fallbackCourse} onChange={(event) => setFallbackCourse(event.target.value)}>{routeCourses.map((course) => <option key={course.courseId} value={course.courseId}>{course.code} · {course.title}</option>)}</select></label><label className="switch-control"><span>Allow summer terms</span><Switch checked={fallbackSummer} onCheckedChange={setFallbackSummer} /></label><label>Transfer target<select className="field" value={fallbackTarget} onChange={(event) => setFallbackTarget(event.target.value)}><option>Fall 2028</option><option>Spring 2029</option><option>Fall 2029</option></select></label><Button variant="outline" onClick={runFallback}>Preview with controls</Button></div></details> : null}
    </section>
  );
}
