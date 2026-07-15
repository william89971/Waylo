"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, FileImage, FileText, LoaderCircle, LockKeyhole, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Status } from "@/components/ui";
import { TranscriptIngestionEventSchema, type TranscriptExtraction, type TranscriptProgressStage } from "@/lib/domain";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { courses } from "@/lib/academic-data";

const steps: Array<{ stage: TranscriptProgressStage; label: string }> = [
  { stage: "reading_document", label: "Reading document" },
  { stage: "extracting_courses", label: "Extracting courses" },
  { stage: "flagging_uncertain_text", label: "Flagging uncertain text" },
  { stage: "matching_known_courses", label: "Matching known courses" },
  { stage: "reviewing_with_student", label: "Reviewing with the student" },
  { stage: "generating_routes", label: "Generating routes" },
  { stage: "validating_prerequisites", label: "Validating prerequisites" },
];

type StepStatus = "waiting" | "active" | "complete" | "review";

function emptyStatuses() {
  return Object.fromEntries(steps.map((step) => [step.stage, "waiting"])) as Record<TranscriptProgressStage, StepStatus>;
}

export function ExtractionWorkflow() {
  const commit = useWorkspaceStore((state) => state.commitTranscriptExtraction);
  const existingCourses = useWorkspaceStore((state) => state.workspace.profile.courses);
  const [file, setFile] = useState<File>();
  const [mode, setMode] = useState<"seeded" | "live">("seeded");
  const [statuses, setStatuses] = useState<Record<TranscriptProgressStage, StepStatus>>(emptyStatuses);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [extraction, setExtraction] = useState<TranscriptExtraction>();
  const [excludedRows, setExcludedRows] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [committed, setCommitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const completedCount = steps.filter((step) => statuses[step.stage] === "complete" || statuses[step.stage] === "review").length;
  const duplicateRows = useMemo(() => {
    const seen = new Set(existingCourses.map((course) => course.courseId));
    const duplicates = new Set<number>();
    extraction?.courses.forEach((course, index) => {
      if (course.normalizedCourseId && seen.has(course.normalizedCourseId)) duplicates.add(index);
      if (course.normalizedCourseId) seen.add(course.normalizedCourseId);
    });
    return duplicates;
  }, [existingCourses, extraction]);

  function selectFile(candidate?: File) {
    setError("");
    setExtraction(undefined);
    setExcludedRows(new Set());
    setCommitted(false);
    if (!candidate) return setFile(undefined);
    const supported = ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(candidate.type);
    if (!supported || candidate.size > 2 * 1024 * 1024) {
      setFile(undefined);
      setError("Use one PDF, PNG, JPEG, or WebP file up to 2 MB. PDFs may contain at most two pages; images should be about four megapixels or less.");
      return;
    }
    setFile(candidate);
  }

  async function run(selectedMode: "seeded" | "live") {
    if (!file) { setError("Choose a transcript screenshot or PDF first."); return; }
    setMode(selectedMode);
    setWorking(true);
    setError("");
    setExtraction(undefined);
    setExcludedRows(new Set());
    setCommitted(false);
    setStatuses(emptyStatuses());
    const form = new FormData();
    form.set("mode", selectedMode);
    form.set("file", file);
    try {
      const response = await fetch("/api/transcripts/extract", { method: "POST", headers: { Accept: "application/x-ndjson" }, body: form });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        if (selectedMode === "live" && payload.seededModeAvailable) {
          setMode("seeded");
          await run("seeded");
          return;
        }
        throw new Error(payload.message ?? "The extraction request could not start.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = TranscriptIngestionEventSchema.parse(JSON.parse(line));
          if (event.type === "progress") {
            setStatuses((current) => ({ ...current, [event.stage]: event.status }));
            setDetails((current) => ({ ...current, [event.stage]: event.detail }));
            if (selectedMode === "seeded" && !reduceMotion) await new Promise((resolve) => setTimeout(resolve, 130));
          } else if (event.type === "result") {
            setMode(event.mode);
            setExtraction(event.extraction);
            const existingIds = new Set(existingCourses.map((course) => course.courseId));
            setExcludedRows(new Set(event.extraction.courses.flatMap((course, index) => course.normalizedCourseId && existingIds.has(course.normalizedCourseId) ? [index] : [])));
          } else {
            throw new Error(event.message);
          }
        }
        if (done) break;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Extraction failed. Your profile was not changed.");
    } finally {
      setWorking(false);
    }
  }

  function updateCourse(index: number, patch: Partial<TranscriptExtraction["courses"][number]>) {
    setExtraction((current) => current ? { ...current, courses: current.courses.map((course, courseIndex) => courseIndex === index ? { ...course, ...patch } : course) } : current);
    setCommitted(false);
  }

  async function confirmExtraction() {
    if (!extraction) return;
    setStatuses((current) => ({ ...current, reviewing_with_student: "complete", generating_routes: "active" }));
    if (!reduceMotion) await new Promise((resolve) => setTimeout(resolve, 220));
    setStatuses((current) => ({ ...current, generating_routes: "complete", validating_prerequisites: "active" }));
    commit({ ...extraction, courses: extraction.courses.filter((_, index) => !excludedRows.has(index)) });
    if (!reduceMotion) await new Promise((resolve) => setTimeout(resolve, 220));
    setStatuses((current) => ({ ...current, validating_prerequisites: "complete" }));
    setCommitted(true);
  }

  return (
    <section className="evidence-to-plan panel">
      <div className="ingestion-intro"><div><span className="eyebrow">Evidence to plan</span><h2>Turn a transcript into a reviewable route</h2><p>The file stays temporary. You decide which normalized course records enter your workspace.</p></div><span className={`mode-pill ${mode}`}>{mode === "seeded" ? "Recorded GPT-5.6 demo result." : "Live GPT-5.6"}</span></div>
      <div className="ingestion-layout">
        <div className="upload-column">
          <button className={`upload-zone ${file ? "has-file" : ""}`} type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0]); }}>
            <input ref={inputRef} hidden type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(event) => selectFile(event.target.files?.[0])} />
            {file ? <>{file.type === "application/pdf" ? <FileText /> : <FileImage />}<strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · ready for temporary processing</span></> : <><Upload /><strong>Drop a transcript screenshot or PDF</strong><span>One file · up to 2 MB · PDF up to 2 pages · image about 4 MP</span></>}
          </button>
          <div className="upload-actions"><Button variant="outline" disabled={!file || working} onClick={() => void run("seeded")}>Use recorded demo</Button><Button disabled={!file || working} onClick={() => void run("live")}>{working ? <LoaderCircle className="spin" data-icon="inline-start" /> : null}Run live extraction</Button></div>
          <div className="privacy-line"><LockKeyhole />No upload, raw text, prompt, or model response is stored.</div>
          {error ? <div className="inline-error"><AlertTriangle />{error}{mode === "live" ? <Button size="sm" variant="outline" onClick={() => void run("seeded")}>Continue with recorded demo</Button> : null}</div> : null}
        </div>
        <div className="progress-column" aria-live="polite">
          <div className="progress-summary"><span>{completedCount} of 7 stages complete</span><Progress aria-label="Evidence-to-plan progress" value={(completedCount / 7) * 100} /></div>
          <ol className="extraction-steps">{steps.map((step, index) => { const stepStatus = statuses[step.stage]; return <motion.li layout={!reduceMotion} className={`extraction-step ${stepStatus}`} key={step.stage}><span className="step-number">{stepStatus === "complete" ? <Check /> : stepStatus === "active" ? <LoaderCircle className="spin" /> : index + 1}</span><div><strong>{step.label}</strong>{details[step.stage] ? <span>{details[step.stage]}</span> : null}</div></motion.li>; })}</ol>
        </div>
      </div>
      <AnimatePresence>{extraction ? <motion.div className="extraction-review" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="title-row"><div><span className="eyebrow">Student review</span><h3>{extraction.courses.length} extracted courses</h3><p>Edit uncertain codes, grades, potential equivalencies, and duplicates before anything enters the workspace.</p></div><Status tone={extraction.reviewFlags.length || duplicateRows.size ? "warning" : "confirmed"} label={`${extraction.reviewFlags.length + duplicateRows.size} review flag${extraction.reviewFlags.length + duplicateRows.size === 1 ? "" : "s"}`} /></div>
        <p className="recorded-result-label">{mode === "seeded" ? "Recorded GPT-5.6 demo result." : "Live extraction result."}</p>
        <div className="extracted-course-list editable">{extraction.courses.map((course, index) => <div className={`extracted-course editable ${excludedRows.has(index) ? "excluded" : ""}`} key={`${index}-${course.term}`}>
          <div className="extracted-course-heading"><div><strong>{course.sourceTitle}</strong><span>{course.term} · {Math.round(course.confidence * 100)}% confidence</span></div><Status tone={course.reviewRequired || duplicateRows.has(index) ? "warning" : "confirmed"} label={duplicateRows.has(index) ? "Possible duplicate" : course.reviewRequired ? "Review" : "Matched"} /></div>
          <div className="extraction-edit-grid"><label>Visible code<input className="field" value={course.sourceCode} onChange={(event) => updateCourse(index, { sourceCode: event.target.value, reviewRequired: true, reviewReason: "Student edited the extracted course code." })} /></label><label>Grade<input className="field" value={course.grade ?? ""} placeholder="Not shown" onChange={(event) => updateCourse(index, { grade: event.target.value || null })} /></label><label>Potential equivalency<select className="field" value={course.normalizedCourseId ?? ""} onChange={(event) => updateCourse(index, { normalizedCourseId: event.target.value || null, reviewRequired: true, reviewReason: "Potential equivalency selected during student review." })}><option value="">Unmatched · counselor review</option>{courses.map((definition) => <option key={definition.id} value={definition.id}>{definition.code} · {definition.title}</option>)}</select></label></div>
          {duplicateRows.has(index) ? <label className="duplicate-resolution"><input type="checkbox" checked={excludedRows.has(index)} onChange={(event) => setExcludedRows((current) => { const next = new Set(current); if (event.target.checked) next.add(index); else next.delete(index); return next; })} /><span>Exclude this possible duplicate from the workspace update</span></label> : null}
          {course.reviewReason ? <p>{course.reviewReason}</p> : null}
        </div>)}</div>
        <div className="review-confirm"><p>{committed ? "Confirmed normalized courses are now in the local workspace." : `${extraction.courses.length - excludedRows.size} reviewed record${extraction.courses.length - excludedRows.size === 1 ? "" : "s"} will be committed. The upload and draft remain unsaved.`}</p><Button disabled={committed || working} onClick={() => void confirmExtraction()}>{committed ? <><Check data-icon="inline-start" />Profile updated</> : "Confirm courses and generate routes"}</Button></div>
      </motion.div> : null}</AnimatePresence>
    </section>
  );
}
