"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, CircleHelp, Flag, Focus, Route as RouteIcon, ShieldCheck, Wrench } from "lucide-react";
import { buildRouteCanvasModel } from "@/lib/route-canvas";
import type { EvidenceReviewResolution, RouteCandidate, RouteCanvasEdge, RouteCanvasNode, TimeMachineState } from "@/lib/domain";
import { Status } from "@/components/ui";

type ZoomLevel = "semesters" | "dependencies" | "evidence";

function StateIcon({ state }: { state: RouteCanvasNode["state"] }) {
  if (state === "broken" || state === "rejected") return <AlertTriangle aria-hidden="true" />;
  if (state === "repaired") return <Wrench aria-hidden="true" />;
  if (state === "uncertain") return <CircleHelp aria-hidden="true" />;
  if (state === "counselor-confirmed") return <ShieldCheck aria-hidden="true" />;
  return <Check aria-hidden="true" />;
}

function edgePath(edge: RouteCanvasEdge, nodeMap: Map<string, RouteCanvasNode>) {
  const from = nodeMap.get(edge.from);
  const to = nodeMap.get(edge.to);
  if (!from || !to) return "";
  if (edge.type === "satisfies") {
    const x = from.x + from.width / 2;
    const y1 = from.y + from.height;
    const y2 = to.y;
    return `M ${x} ${y1} C ${x} ${y1 + 16}, ${x} ${y2 - 16}, ${x} ${y2}`;
  }
  const x1 = from.x + from.width;
  const y1 = from.y + from.height / 2;
  const x2 = to.x;
  const y2 = to.y + to.height / 2;
  const bend = Math.max(28, (x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

interface AcademicRouteCanvasProps {
  route: RouteCandidate;
  timeState: TimeMachineState;
  reviewResolutions: EvidenceReviewResolution[];
  originLabel: string;
  destinationLabel: string;
}

export function AcademicRouteCanvas({ route, timeState, reviewResolutions, originLabel, destinationLabel }: AcademicRouteCanvasProps) {
  const reduceMotion = useReducedMotion();
  const [zoom, setZoom] = useState<ZoomLevel>("dependencies");
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const model = useMemo(() => buildRouteCanvasModel(route, { state: timeState, reviewResolutions, originLabel, destinationLabel }), [destinationLabel, originLabel, reviewResolutions, route, timeState]);
  const nodeMap = useMemo(() => new Map(model.nodes.map((node) => [node.id, node])), [model.nodes]);
  const selected = model.nodes.find((node) => node.id === selectedNodeId);
  const courseNodes = model.nodes.filter((node) => node.type === "course");

  return (
    <section className={`route-canvas-shell route-state-${timeState}`} aria-labelledby="route-canvas-title">
      <header className="route-canvas-toolbar">
        <div>
          <span className="workspace-kicker">Academic Route Canvas</span>
          <h2 id="route-canvas-title">{route.label}</h2>
          <p>{route.estimatedTransferTerm} transfer estimate · {route.totalPlannedUnits} planned units · {route.valid ? "validator passed" : "candidate rejected"}</p>
        </div>
        <div className="semantic-zoom" role="group" aria-label="Route detail level">
          {(["semesters", "dependencies", "evidence"] as ZoomLevel[]).map((level) => (
            <button key={level} type="button" aria-pressed={zoom === level} className={zoom === level ? "active" : ""} onClick={() => setZoom(level)}>{level}</button>
          ))}
        </div>
      </header>

      <motion.div className="route-canvas-viewport" initial={false} animate={reduceMotion ? undefined : { opacity: 1 }} transition={{ duration: 0.2 }}>
        <svg className="route-canvas-svg" viewBox={`0 0 ${model.width} ${model.height}`} role="group" aria-labelledby="route-canvas-svg-title route-canvas-svg-desc">
          <title id="route-canvas-svg-title">{`${route.label} dependency route`}</title>
          <desc id="route-canvas-svg-desc">{`A visual academic route from ${originLabel} through ${route.terms.length} terms to ${destinationLabel}. A synchronized structured list follows the diagram.`}</desc>
          <defs>
            <marker id={`arrow-${timeState}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          </defs>
          <g className="canvas-grid" aria-hidden="true">
            {Array.from({ length: Math.ceil(model.width / 32) }).map((_, index) => <line key={`v-${index}`} x1={index * 32} x2={index * 32} y1={0} y2={model.height} />)}
            {Array.from({ length: Math.ceil(model.height / 32) }).map((_, index) => <line key={`h-${index}`} x1={0} x2={model.width} y1={index * 32} y2={index * 32} />)}
          </g>
          {zoom !== "semesters" ? <g className="route-edges">
            {model.edges.filter((edge) => zoom === "evidence" || edge.type !== "evidence_dependency").map((edge) => <path key={edge.id} className={`route-edge edge-${edge.type} state-${edge.state}`} d={edgePath(edge, nodeMap)} markerEnd={`url(#arrow-${timeState})`} />)}
          </g> : null}
          <g className="route-nodes">
            {model.nodes.filter((node) => zoom !== "semesters" || node.type !== "course").map((node) => (
              <g
                key={node.id}
                className={`route-node node-${node.type} state-${node.state} ${selectedNodeId === node.id ? "selected" : ""}`}
                transform={`translate(${node.x} ${node.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${node.label}. ${node.detail}. ${node.state}.`}
                onClick={() => setSelectedNodeId(node.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedNodeId(node.id); } }}
              >
                <rect width={node.width} height={node.height} rx={node.type === "semester" ? 12 : 10} />
                <text className="node-label" x={14} y={node.type === "semester" ? 20 : 22}>{node.label}</text>
                <text className="node-detail" x={14} y={node.type === "semester" ? 36 : 40}>{node.detail.length > 28 ? `${node.detail.slice(0, 27)}…` : node.detail}</text>
                {node.type === "destination" ? <Flag x={node.width - 30} y={20} /> : null}
              </g>
            ))}
          </g>
        </svg>
      </motion.div>

      <div className="mobile-route-narrative" aria-label="Vertical academic route">
        <div className="narrative-position"><span><RouteIcon aria-hidden="true" /></span><div><small>Current position</small><strong>{originLabel}</strong></div></div>
        {route.terms.map((term) => (
          <section key={term.id} className="narrative-term" aria-labelledby={`narrative-${term.id}`}>
            <header><div><strong id={`narrative-${term.id}`}>{term.label}</strong><small>{term.totalUnits} units</small></div><Status tone="planned" label="Milestone" /></header>
            <div className="narrative-courses">
              {term.courses.map((course) => {
                const node = courseNodes.find((candidate) => candidate.courseId === course.courseId);
                return <motion.button layoutId={`course-${course.courseId}`} key={course.courseId} type="button" className={`narrative-course state-${node?.state ?? "verified"}`} onClick={() => setSelectedNodeId(node?.id)}><span><strong>{course.code}</strong><small>{course.title}</small></span><span className="narrative-state"><StateIcon state={node?.state ?? "verified"} />{node?.state ?? "verified"}</span></motion.button>;
              })}
            </div>
          </section>
        ))}
        <div className="narrative-destination"><span><Flag aria-hidden="true" /></span><div><small>Destination milestone</small><strong>{destinationLabel}</strong><p>{route.estimatedTransferTerm}</p></div></div>
      </div>

      <div className="route-canvas-footer">
        <div className="canvas-legend" aria-label="Route state legend">
          <span><Check />Verified</span><span><ShieldCheck />Counselor-confirmed</span><span><CircleHelp />Evidence review</span><span><AlertTriangle />Broken or rejected</span><span><Wrench />Repaired</span>
        </div>
        {selected ? <div className="selected-node-detail" aria-live="polite"><Focus aria-hidden="true" /><div><strong>{selected.label}</strong><span>{selected.detail} · {selected.state.replace("-", " ")}{zoom === "evidence" && selected.evidenceIds.length ? ` · sources ${selected.evidenceIds.join(", ")}` : ""}</span></div></div> : <p className="canvas-hint">Select a node to inspect its state. The list below mirrors every course for keyboard and screen-reader access.</p>}
      </div>

      <details className="structured-route-list">
        <summary>Open synchronized structured route list</summary>
        <ol>
          {route.terms.map((term) => <li key={term.id}><strong>{term.label} · {term.totalUnits} units</strong><ul>{term.courses.map((course) => { const node = courseNodes.find((candidate) => candidate.courseId === course.courseId); return <li key={course.courseId}><button type="button" onClick={() => setSelectedNodeId(node?.id)}>{course.code} · {course.title} · {node?.state ?? "verified"}</button></li>; })}</ul></li>)}
        </ol>
      </details>
    </section>
  );
}
