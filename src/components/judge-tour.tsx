"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, FileCheck2, GitBranch, GraduationCap, LoaderCircle, Microscope, RotateCcw, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Status, Tag } from "@/components/ui";
import { UncertaintyActionCard } from "@/components/uncertainty-action-card";
import { evidence, programById } from "@/lib/academic-data";
import { buildAdvisorDecisionPacket } from "@/lib/advisor-summary";
import { PlanCommandInterpretationSchema, type PlanCommandInterpretation } from "@/lib/domain";
import { useWorkspaceStore } from "@/lib/workspace-store";

const TOUR_REQUEST = "I may have to drop Calculus I. Show me what changes.";

const stages = [
  { id: 0, label: "Consequence", detail: "See the timeline change" },
  { id: 1, label: "Intelligence and validation", detail: "Inspect the boundary" },
  { id: 2, label: "Evidence and trust", detail: "Verify the source" },
  { id: 3, label: "Counselor handoff", detail: "Take the decision forward" },
] as const;

const architecture = [
  "Student request",
  "GPT-5.6 structured interpretation",
  "Deterministic candidate search",
  "Prerequisite and requirement validation",
  "Human confirmation",
  "Evidence-backed route",
] as const;

export function JudgeTour() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const simulation = useWorkspaceStore((state) => state.simulationResult);
  const simulateChanges = useWorkspaceStore((state) => state.simulateChanges);
  const clearSimulation = useWorkspaceStore((state) => state.clearSimulation);
  const resetWorkspace = useWorkspaceStore((state) => state.reset);
  const [stage, setStage] = useState(0);
  const [interpretation, setInterpretation] = useState<PlanCommandInterpretation>();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const freshStartHandled = useRef(false);

  useEffect(() => {
    if (freshStartHandled.current || new URLSearchParams(window.location.search).get("fresh") !== "1") return;
    freshStartHandled.current = true;
    void resetWorkspace().then(() => window.history.replaceState(null, "", "/judge-tour"));
  }, [resetWorkspace]);

  const baseline = simulation?.baselineRoute ?? workspace.plan?.routes.find((route) => route.id === workspace.activeRouteId) ?? workspace.plan?.routes[0];
  const proposed = simulation?.proposedRoute;
  const revised = simulation?.simulatedRoute;
  const plan = simulation?.simulated ?? workspace.plan;
  const rejected = plan?.candidateOutcomes.filter((outcome) => outcome.status === "rejected") ?? [];
  const packet = workspace.plan ? buildAdvisorDecisionPacket(workspace.profile, workspace.plan, workspace.reviewResolutions, workspace.constraints, simulation?.delta) : undefined;
  const program = programById.get(workspace.profile.selectedPathwayId);
  const tourEvidence = evidence.filter((item) => ["coc-math-2025", "assist-review", workspace.profile.selectedPathwayId].includes(item.id));
  const courseMoves = simulation?.delta.courseMoves.length ?? 0;

  async function runConsequence() {
    setRunning(true);
    setError("");
    clearSimulation();
    try {
      const response = await fetch("/api/plan-commands/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "seeded", command: TOUR_REQUEST, selectedPathwayId: workspace.profile.selectedPathwayId, activeRouteId: baseline?.id }),
      });
      if (!response.ok) throw new Error("The recorded interpretation could not start.");
      const nextInterpretation = PlanCommandInterpretationSchema.parse(await response.json());
      if (nextInterpretation.clarificationItems.length || !nextInterpretation.changes.length) throw new Error("The tour request needs clarification.");
      setInterpretation(nextInterpretation);
      simulateChanges(nextInterpretation.changes);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The tour could not run.");
    } finally {
      setRunning(false);
    }
  }

  async function restart() {
    setRunning(true);
    await resetWorkspace();
    setInterpretation(undefined);
    setStage(0);
    setError("");
    setRunning(false);
  }

  function openJudgeMode() {
    window.dispatchEvent(new Event("waylo:open-judge-mode"));
  }

  return (
    <div className="judge-tour">
      <header className="tour-header">
        <div>
          <span className="workspace-kicker">2-minute judge tour</span>
          <h1>See one decision become a validated route.</h1>
          <p>Follow a seeded College of the Canyons student from consequence to counselor-ready evidence. The full Waylo workspace remains available in the navigation.</p>
        </div>
        <div className="tour-header-actions">
          <span className="tour-mode"><span />Seeded · no OpenAI request</span>
          <Button variant="outline" onClick={() => void restart()} disabled={running}><RotateCcw data-icon="inline-start" />Reset tour</Button>
        </div>
      </header>

      <nav className="tour-stage-nav" aria-label="Judge tour stages">
        {stages.map((item, index) => (
          <button key={item.id} type="button" className={stage === item.id ? "active" : ""} aria-current={stage === item.id ? "step" : undefined} onClick={() => setStage(item.id)}>
            <span>{index + 1}</span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </button>
        ))}
      </nav>

      <main className="tour-stage" aria-live="polite">
        {stage === 0 ? (
          <section className="tour-consequence" aria-labelledby="tour-consequence-title">
            <div className="tour-stage-copy">
              <span className="workspace-kicker">Stage 1 · Consequence</span>
              <h2 id="tour-consequence-title">What happens if Calculus I moves?</h2>
              <p>Waylo starts with {workspace.profile.name}&apos;s validated {program?.universityName} {program?.name} route, then tests the change without overwriting the saved baseline.</p>
              <blockquote><span>Student request</span>“{TOUR_REQUEST}”</blockquote>
              {!simulation ? <Button className="tour-primary-action" onClick={() => void runConsequence()} disabled={running}>{running ? <LoaderCircle className="spin" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}{running ? "Running the recorded demonstration…" : "Show me the consequence"}</Button> : null}
              {error ? <div className="tour-inline-error"><AlertTriangle />{error}</div> : null}
              {interpretation ? <div className="tour-interpretation"><div><span>Recorded GPT-5.6 demo result.</span><strong>{interpretation.summary}</strong></div><Status tone="confirmed" label="Schema valid" /></div> : null}
            </div>
            <div className={`tour-impact ${simulation ? "resolved" : "waiting"}`}>
              <div className="tour-impact-heading"><span className="workspace-kicker">Academic Twin · consequence preview</span><Status tone={simulation ? "warning" : "confirmed"} label={simulation ? "Unsaved simulation" : "Saved baseline"} /></div>
              <div className="tour-before-after">
                <div><small>Before</small><strong>{baseline?.estimatedTransferTerm ?? "Loading"}</strong><span>{baseline?.label ?? "Validated route"}</span></div>
                <ArrowRight aria-hidden="true" />
                <div><small>After</small><strong>{revised?.estimatedTransferTerm ?? "Run the change"}</strong><span>{revised ? "Revalidated route" : "Baseline remains protected"}</span></div>
              </div>
              {simulation ? <>
                <p className="tour-impact-statement">One course decision moves {courseMoves} academic milestone{courseMoves === 1 ? "" : "s"} and changes the estimated transfer term from {simulation.delta.baselineTransferTerm} to {simulation.delta.simulatedTransferTerm}.</p>
                <div className="tour-milestones">{simulation.delta.courseMoves.slice(0, 4).map((move) => <div key={move.courseId}><span>{move.code}</span><strong>{move.fromTerm} → {move.toTerm}</strong></div>)}</div>
                <Button onClick={() => setStage(1)}>See how Waylo validates it <ArrowRight data-icon="inline-end" /></Button>
              </> : <p className="tour-impact-placeholder">The strongest consequence appears here before any technical explanation.</p>}
            </div>
          </section>
        ) : null}

        {stage === 1 ? (
          <section aria-labelledby="tour-intelligence-title">
            <div className="tour-stage-title"><div><span className="workspace-kicker">Stage 2 · Intelligence and validation</span><h2 id="tour-intelligence-title">The model interprets. Deterministic code decides.</h2><p>GPT-5.6 turns unstructured intent into a bounded, schema-validated change. It never grants credit, waives prerequisites, or approves a route.</p></div><Button variant="outline" onClick={openJudgeMode}><Microscope data-icon="inline-start" />Open Judge Mode</Button></div>
            <div className="tour-architecture" aria-label="Waylo architecture flow">{architecture.map((step, index) => <div key={step}><span>{index + 1}</span><strong>{step}</strong>{index < architecture.length - 1 ? <ArrowRight aria-hidden="true" /> : null}</div>)}</div>
            <div className="tour-validation-grid">
              <article className="tour-validation-summary">
                <div className="tour-card-title"><GitBranch /><div><span className="workspace-kicker">Candidate search</span><h3>{plan?.candidateOutcomes.length ?? 0} inspectable outcomes</h3></div></div>
                <dl><div><dt>Accepted</dt><dd>{plan?.candidateOutcomes.filter((outcome) => outcome.status === "accepted").length ?? 0}</dd></div><div><dt>Rejected</dt><dd>{rejected.length}</dd></div><div><dt>Repair attempts</dt><dd>{plan?.repairAttempt ? 1 : 0}</dd></div></dl>
                <p>Search is capped at 24 internal candidates; every displayed route is revalidated from scratch.</p>
              </article>
              <article className="tour-rejection">
                <div className="tour-card-title"><AlertTriangle /><div><span className="workspace-kicker">Deterministic rejection</span><h3>{proposed?.label ?? "Rejected candidate retained"}</h3></div></div>
                <p>{rejected[0]?.rejectionReasons[0]?.message ?? proposed?.issues.find((issue) => issue.severity === "blocker")?.message ?? "The invalid candidate remains inspectable and cannot replace the baseline."}</p>
                <div className="tour-rule-tags">{["Prerequisites", "Requirements", "Term offerings", "Unit cap"].map((rule) => <Tag key={rule}>{rule}</Tag>)}</div>
              </article>
              <article className="tour-repair">
                <div className="tour-card-title"><Wrench /><div><span className="workspace-kicker">Bounded repair</span><h3>{plan?.repairAttempt?.succeeded ? "Repair revalidated" : "No repair passed"}</h3></div></div>
                <p>{plan?.repairAttempt?.detail ?? "Waylo retains the last valid baseline when a bounded repair cannot pass every rule."}</p>
                <div className="tour-safe-boundary"><ShieldCheck />Human confirmation is required before a valid proposal can replace the saved plan.</div>
              </article>
            </div>
            <div className="tour-footer-actions"><Button variant="outline" onClick={() => setStage(0)}>Back</Button><Button onClick={() => setStage(2)}>Verify the evidence <ArrowRight data-icon="inline-end" /></Button></div>
          </section>
        ) : null}

        {stage === 2 ? (
          <section aria-labelledby="tour-evidence-title">
            <div className="tour-stage-title"><div><span className="workspace-kicker">Stage 3 · Evidence and trust</span><h2 id="tour-evidence-title">A valid schedule is not the same as a verified equivalency.</h2><p>Waylo carries source status into the route and keeps counselor confirmation separate from the underlying evidence.</p></div><Status tone="warning" label="1 unresolved evidence item" /></div>
            <div className="tour-evidence-grid">
              {tourEvidence.map((item) => <article key={item.id}><FileCheck2 /><div><strong>{item.title}</strong><p>{item.note}</p><span>{item.id} · {item.effectiveYear}</span></div><Status tone={item.status === "verified" ? "confirmed" : "warning"} label={item.status} /></article>)}
            </div>
            <UncertaintyActionCard courseId="coc-math-211" route={revised ?? baseline} compact />
            <div className="tour-footer-actions"><Button variant="outline" onClick={() => setStage(1)}>Back</Button><Button onClick={() => setStage(3)}>Prepare the counselor handoff <ArrowRight data-icon="inline-end" /></Button></div>
          </section>
        ) : null}

        {stage === 3 ? (
          <section aria-labelledby="tour-handoff-title">
            <div className="tour-stage-title"><div><span className="workspace-kicker">Stage 4 · Counselor handoff</span><h2 id="tour-handoff-title">Turn the simulation into a better conversation.</h2><p>The Advisor Decision Packet separates route facts, unresolved evidence, constraints, alternatives, and exact questions for a counselor.</p></div><Status tone="confirmed" label="Ready to review" /></div>
            <div className="tour-handoff-grid">
              <article className="tour-packet-preview">
                <header><div><span className="landing-brand">Waylo</span><small>Advisor Decision Packet</small></div><GraduationCap /></header>
                <div className="tour-packet-route"><div><span>Student</span><strong>{workspace.profile.name}</strong></div><div><span>Destination</span><strong>{packet?.destination}</strong></div><div><span>Current estimate</span><strong>{simulation?.delta.simulatedTransferTerm ?? packet?.baseline.estimatedTransferTerm}</strong></div></div>
                <h3>Questions for my counselor</h3>
                <ol>{packet?.questionsForCounselor.slice(0, 3).map((question) => <li key={question}>{question}</li>)}</ol>
                <Link href="/advisor-summary" className="button primary">Open printable packet <ArrowRight size={16} /></Link>
              </article>
              <aside className="tour-outcome">
                <Check />
                <span className="workspace-kicker">Impact</span>
                <h3>Waylo makes a high-stakes plan change reviewable before it becomes real.</h3>
                <p>The student sees the consequence, the machine boundary, the evidence gap, and the right human next step—in one coherent decision flow.</p>
                <div><ShieldCheck />Planning aid, not an official degree audit. Review decisions with a counselor.</div>
                <Link href="/roadmap" className="tour-text-link">Continue in the full Academic Twin <ArrowRight /></Link>
              </aside>
            </div>
            <div className="tour-footer-actions"><Button variant="outline" onClick={() => setStage(2)}>Back</Button><Button variant="outline" onClick={() => void restart()}><RotateCcw data-icon="inline-start" />Replay tour</Button></div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
