"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, LockKeyhole, Plus } from "lucide-react";
import { PageHeader, Status } from "@/components/ui";
import { ExtractionWorkflow } from "@/components/extraction-workflow";
import { UncertaintyActionCard } from "@/components/uncertainty-action-card";
import { useWorkspaceStore } from "@/lib/workspace-store";

export default function ProfilePage() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const [showManual, setShowManual] = useState(false);
  return (
    <div className="page">
      <PageHeader title="Build your academic profile" subtitle="Bring evidence into Waylo, review every normalized course, and decide what becomes part of your plan." />
      <ExtractionWorkflow />
      <section className="panel profile-records">
        <div className="title-row"><div><span className="eyebrow">Normalized workspace</span><h2 className="section-title">Confirmed course records</h2><p className="section-copy">This table contains local structured data—not the uploaded document.</p></div><Status tone="confirmed" label={`${workspace.profile.courses.length} records`} /></div>
        <div className="table-scroll"><table className="transcript-table"><thead><tr><th>Course</th><th>Title</th><th>Units</th><th>Grade</th><th>Evidence status</th><th>Source</th></tr></thead><tbody>{workspace.profile.courses.map((course) => { const counselorConfirmed = workspace.reviewResolutions.some((resolution) => resolution.courseId === course.courseId); return <tr className={course.matchStatus === "uncertain" ? "uncertain" : ""} key={`${course.courseId}-${course.term}`}><td data-label="Course"><strong>{course.code}</strong></td><td data-label="Title">{course.title}</td><td data-label="Units">{course.units}</td><td data-label="Grade">{course.grade ?? "Planned"}</td><td data-label="Evidence status">{counselorConfirmed ? <Status tone="planned" label="Counselor-confirmed" /> : course.matchStatus === "uncertain" ? <Status tone="warning" label="Uncertain" /> : <Status tone="confirmed" label="Verified" />}</td><td data-label="Source">{course.sourceLabel ?? "Local profile"}</td></tr>; })}</tbody></table></div>
        {showManual ? <div className="manual-entry"><input className="field" aria-label="Course code" placeholder="Course code" /><input className="field" aria-label="Course title" placeholder="Course title" /><input className="field" aria-label="Units" placeholder="Units" inputMode="decimal" /><p>Manual courses remain uncertain until evidence is reviewed.</p></div> : null}
        <div className="profile-record-actions"><button type="button" className="button" onClick={() => setShowManual((shown) => !shown)}>{showManual ? "Close manual entry" : <><Plus size={16} />Add course manually</>}</button><Link className="button primary" href="/pathways"><Check size={16} />Continue to pathways</Link></div>
      </section>
      <UncertaintyActionCard courseId="coc-math-211" />
      <div className="privacy-banner"><LockKeyhole size={18} /><div><strong>Local-first academic workspace</strong><p>Waylo stores normalized confirmed data in this browser. Raw uploads and extraction drafts stay ephemeral.</p></div></div>
    </div>
  );
}
