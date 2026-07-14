"use client";

import { useState } from "react";
import { AlertTriangle, Check, FilePlus2, LoaderCircle, LockKeyhole, Plus, Sparkles, Upload } from "lucide-react";
import { PageHeader, Status } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/lib/workspace-store";

type ExtractionState = "idle" | "working" | "seeded" | "missing-key" | "failed";

export default function ProfilePage() {
  const profile = useWorkspaceStore((state) => state.workspace.profile);
  const confirmCourse = useWorkspaceStore((state) => state.confirmCourse);
  const [showManual, setShowManual] = useState(false);
  const [uploadFile, setUploadFile] = useState<File>();
  const [extractionState, setExtractionState] = useState<ExtractionState>("idle");
  const uncertain = profile.courses.find((course) => course.matchStatus === "uncertain");

  async function runSeededExtraction() {
    setExtractionState("working");
    try {
      const response = await fetch("/api/transcripts/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "seeded", text: "seeded transcript review" }) });
      setExtractionState(response.ok ? "seeded" : "failed");
    } catch { setExtractionState("failed"); }
  }

  async function runLiveExtraction() {
    if (!uploadFile) return;
    setExtractionState("working");
    const form = new FormData(); form.set("mode", "live"); form.set("file", uploadFile);
    try {
      const response = await fetch("/api/transcripts/extract", { method: "POST", body: form });
      setExtractionState(response.ok ? "seeded" : response.status === 503 ? "missing-key" : "failed");
    } catch { setExtractionState("failed"); }
  }

  return <div className="page"><PageHeader title="Build your academic profile" subtitle="Add your courses, review what Waylo found, and correct anything uncertain." action={<label className="button"><Upload size={16} />Load transcript<input hidden type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; setUploadFile(file); setExtractionState("idle"); }} /></label>} /><div className="profile-steps" aria-label="Profile setup progress"><div className="profile-step done"><strong><Check size={15} /></strong><span>Upload</span></div><div className="profile-step done"><strong><Check size={15} /></strong><span>Processing</span></div><div className="profile-step active"><strong>3</strong><span>Review</span></div><div className="profile-step"><strong>4</strong><span>Confirm</span></div></div>{uploadFile ? <div className="callout info" style={{ marginBottom: 16 }}><div className="title-row"><div><div className="callout-title"><LockKeyhole size={18} />{uploadFile.name}</div><p>{extractionState === "missing-key" ? "Live extraction is not configured. Add OPENAI_API_KEY server-side or continue with seeded review." : extractionState === "failed" ? "The request could not finish. Your local profile was not changed." : extractionState === "seeded" ? "The extraction contract completed. The sample profile remains active until extracted courses are reviewed and confirmed." : "The file is held only for this request and is not persisted by Waylo."}</p></div><div className="cluster"><button className="button" type="button" disabled={extractionState === "working"} onClick={runSeededExtraction}>Use seeded</button><Button className="button primary" type="button" disabled={extractionState === "working"} onClick={runLiveExtraction}>{extractionState === "working" ? <><LoaderCircle data-icon="inline-start" className="spin" />Extracting</> : <><Sparkles data-icon="inline-start" />Run live extraction</>}</Button></div></div></div> : null}<div className="split"><section className="panel" style={{ padding: 14 }}><table className="transcript-table"><thead><tr><th>Course</th><th>Title</th><th>Units</th><th>Grade</th><th>Status</th><th>Evidence</th></tr></thead><tbody>{profile.courses.map((course) => <tr className={course.matchStatus === "uncertain" ? "uncertain" : ""} key={`${course.courseId}-${course.term}`}><td data-label="Course"><strong>{course.code}</strong></td><td data-label="Title">{course.title}</td><td data-label="Units">{course.units}</td><td data-label="Grade">{course.grade ?? "Planned"}</td><td data-label="Status">{course.matchStatus === "uncertain" ? <Status tone="warning" label="Uncertain match" /> : <Status tone="confirmed" label="Confirmed" />}</td><td data-label="Evidence"><span className="text-link">{course.sourceLabel ?? "Profile"}</span></td></tr>)}</tbody></table>{uncertain ? <div className="callout warning" style={{ margin: "8px 0 14px" }}><div className="callout-title"><AlertTriangle size={20} />Review {uncertain.code} — {uncertain.title}</div><p>Confirm that Waylo read the course identity correctly. This does not replace checking the university articulation in ASSIST.</p><button type="button" className="button primary" style={{ marginTop: 14 }} onClick={() => confirmCourse(uncertain.courseId)}>Confirm course identity</button></div> : <div className="callout info" style={{ margin: "8px 0 14px" }}><div className="callout-title"><Check size={20} />Course identities confirmed</div><p>Articulation evidence marked partial still remains on your counselor-review list.</p></div>}{showManual ? <div className="panel-soft" style={{ padding: 14, marginBottom: 14 }}><div className="three-column"><input className="field" aria-label="Course code" placeholder="Course code" /><input className="field" aria-label="Course title" placeholder="Course title" /><input className="field" aria-label="Units" placeholder="Units" inputMode="decimal" /></div><p className="section-copy">Manual courses remain unverified until evidence is attached.</p></div> : null}<div className="title-row"><button type="button" className="button" onClick={() => setShowManual((shown) => !shown)}>{showManual ? "Close manual entry" : <><Plus size={16} />Add course manually</>}</button><a className="button primary" href="/pathways">Confirm and choose pathways</a></div></section><aside className="stack"><section className="callout"><h2 className="section-title">Extraction summary</h2><div className="stack" style={{ marginTop: 15 }}><Status tone="confirmed" label={`${profile.courses.length} courses found`} /><Status tone={uncertain ? "warning" : "confirmed"} label={uncertain ? "1 item needs review" : "No identity questions"} /><Status tone="confirmed" label="No duplicates found" /></div></section><section className="callout info"><div className="callout-title"><LockKeyhole size={20} />Your privacy matters</div><p>Raw uploads are not saved. Waylo persists only normalized profile data on this device.</p></section><section className="callout"><div className="callout-title"><FilePlus2 size={20} />Seeded review mode</div><p>This screen uses the sample Jordan Lee profile until a live extraction is explicitly run and reviewed.</p></section></aside></div></div>;
}
