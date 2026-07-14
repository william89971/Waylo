"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, GitBranch, Scale } from "lucide-react";
import { PageHeader, Status, Tag } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoadmapView } from "@/components/roadmap-view";
import { programs, programById } from "@/lib/academic-data";
import { comparePathwayRequirementSets } from "@/lib/pathway-comparison";
import { useWorkspaceStore } from "@/lib/workspace-store";

export default function ComparePage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const selectRoute = useWorkspaceStore((state) => state.selectRoute);
  const [leftId, setLeftId] = useState(workspace.profile.selectedPathwayId);
  const [rightId, setRightId] = useState(workspace.profile.selectedPathwayId === "berkeley-data" ? "ucla-data" : "berkeley-data");
  const comparison = comparePathwayRequirementSets(leftId, rightId);
  const left = programById.get(leftId); const right = programById.get(rightId);
  const activeRoute = workspace.plan?.routes.find((route) => route.id === workspace.activeRouteId) ?? workspace.plan?.routes[0];
  return (
    <div className="page">
      <PageHeader title="Compare pathways and route tradeoffs" subtitle="See shared preparation, destination-specific requirements, unresolved evidence, and workload differences without collapsing them into a single score." />
      <Tabs defaultValue="pathways" className="compare-tabs">
        <TabsList className="waylo-tab-list"><TabsTrigger value="pathways">Pathway overlap</TabsTrigger><TabsTrigger value="strategies">Route strategies</TabsTrigger></TabsList>
        <TabsContent value="pathways">
          <section className="panel comparison-controls"><label>First pathway<select className="field" value={leftId} onChange={(event) => setLeftId(event.target.value)}>{programs.map((program) => <option key={program.id} value={program.id}>{program.universityName} · {program.name}</option>)}</select></label><span className="compare-vs">and</span><label>Second pathway<select className="field" value={rightId} onChange={(event) => setRightId(event.target.value)}>{programs.map((program) => <option key={program.id} value={program.id}>{program.universityName} · {program.name}</option>)}</select></label></section>
          <section className="panel overlap-visual" aria-label="Pathway requirement overlap"><div className="pathway-branch left"><span className="eyebrow">{left?.universityName}</span><h2>{left?.name} {left?.degree}</h2><div className="requirement-stack">{comparison.leftOnly.map((course) => <Tag key={course}>{course} · unique</Tag>)}</div></div><div className="shared-rail"><span className="rail-node"><GitBranch size={18} /></span><span className="eyebrow">Verified shared course set</span><strong>{comparison.shared.length} shared requirements</strong><div className="shared-courses">{comparison.shared.map((course) => <Tag tone="teal" key={course}>{course}</Tag>)}</div><span className="rail-line" /></div><div className="pathway-branch right"><span className="eyebrow">{right?.universityName}</span><h2>{right?.name} {right?.degree}</h2><div className="requirement-stack">{comparison.rightOnly.map((course) => <Tag tone="purple" key={course}>{course} · unique</Tag>)}</div></div></section>
          <div className="compare-review-grid"><section className="callout warning"><div className="callout-title"><AlertTriangle size={19} />Unresolved evidence</div><p>{comparison.unresolved.length} distinct course matches still rely on an ASSIST review record.</p><div className="tag-cloud">{comparison.unresolved.map((course) => <Tag tone="amber" key={course}>{course}</Tag>)}</div></section><section className="callout info"><div className="callout-title">Comparison boundary</div><p>Shared and unique sets come directly from the supported requirement-course records. They are not illustrative similarity scores.</p>{comparison.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}</section></div>
        </TabsContent>
        <TabsContent value="strategies">
          <div className="strategy-grid">{workspace.plan?.routes.map((route) => <button type="button" className={`strategy-card ${route.id === workspace.activeRouteId ? "active" : ""}`} onClick={() => selectRoute(route.id)} key={route.id}><div className="title-row"><span className="strategy-icon"><Scale size={19} /></span><Tag tone={route.strategy === "overlap" ? "purple" : route.strategy === "balanced" ? "teal" : "default"}>{route.estimatedTransferTerm}</Tag></div><h2>{route.label}</h2><p>{route.description}</p><dl><div><dt>Planned load</dt><dd>{route.totalPlannedUnits} units</dd></div><div><dt>Milestones</dt><dd>{route.terms.length} terms</dd></div><div><dt>Blockers</dt><dd>{route.issues.filter((issue) => issue.severity === "blocker").length}</dd></div></dl>{route.id === workspace.activeRouteId ? <Status tone="confirmed" label="Selected route" /> : null}</button>)}</div>
          {activeRoute ? <section className="panel roadmap-panel compare-roadmap"><div className="title-row roadmap-title"><div><span className="eyebrow">Selected strategy</span><h2>{activeRoute.label}</h2></div><Link href="/roadmap" className="button primary">Open roadmap <ArrowRight size={16} /></Link></div><RoadmapView route={activeRoute} compact /></section> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
