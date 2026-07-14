"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, FileImage, FileText, LoaderCircle, LockKeyhole, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Status } from "@/components/ui";
import { TranscriptIngestionEventSchema, type TranscriptExtraction, type TranscriptProgressStage } from "@/lib/domain";
import { useWorkspaceStore } from "@/lib/workspace-store";

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

export function ExtractionWorkflow() {
  const commit = useWorkspaceStore((state) => state.commitTranscriptExtraction);
  const [file, setFile] = useState<File>();
  const [mode, setMode] = useState<"seeded" | "live">("seeded");
  const [statuses, setStatuses] = useState<Record<TranscriptProgressStage, StepStatus>>(() => Object.fromEntries(steps.map((step) => [step.stage, "waiting"])) as Record<TranscriptProgressStage, StepStatus>);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [extraction, setExtraction] = useState<TranscriptExtraction>();
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [committed, setCommitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const completedCount = steps.filter((step) => statuses[step.stage] === "complete" || statuses[step.stage] === "review").length;

  function selectFile(candidate?: File) {
    setError(""); setExtraction(undefined); setCommitted(false);
    if (!candidate) return setFile(undefined);
    const supported = ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(candidate.type);
    if (!supported || candidate.size > 8 * 1024 * 1024) { setFile(undefined); setError("Use a PDF, PNG, JPEG, or WebP file up to 8 MB."); return; }
    setFile(candidate);
  }

  async function run(selectedMode: "seeded" | "live") {
    if (!file) { setError("Choose a transcript screenshot or PDF first."); return; }
    setMode(selectedMode); setWorking(true); setError(""); setExtraction(undefined); setCommitted(false);
    setStatuses(Object.fromEntries(steps.map((step) => [step.stage, "waiting"])) as Record<TranscriptProgressStage, StepStatus>);
    const form = new FormData(); form.set("mode", selectedMode); form.set("file", file);
    try {
      const response = await fetch("/api/transcripts/extract", { method: "POST", headers: { Accept: "application/x-ndjson" }, body: form });
      if (!response.ok || !response.body) throw new Error("The extraction request could not start.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = TranscriptIngestionEventSchema.parse(JSON.parse(line));
          if (event.type === "progress") {
            setStatuses((current) => ({ ...current, [event.stage]: event.status }));
            setDetails((current) => ({ ...current, [event.stage]: event.detail }));
            if (selectedMode === "seeded") await new Promise((resolve) => setTimeout(resolve, 130));
          } else if (event.type === "result") {
            setExtraction(event.extraction);
          } else {
            throw new Error(event.message);
          }
        }
        if (done) break;
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Extraction failed. Your profile was not changed."); }
    finally { setWorking(false); }
  }

  async function confirmExtraction() {
    if (!extraction) return;
    setStatuses((current) => ({ ...current, reviewing_with_student: "complete", generating_routes: "active" }));
    await new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : 220));
    setStatuses((current) => ({ ...current, generating_routes: "complete", validating_prerequisites: "active" }));
    commit(extraction);
    await new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : 220));
    setStatuses((current) => ({ ...current, validating_prerequisites: "complete" }));
    setCommitted(true);
  }

  return (
    <section className="evidence-to-plan panel">
      <div className="ingestion-intro"><div><span className="eyebrow">Evidence to plan</span><h2>Turn a transcript into a reviewable route</h2><p>The file stays temporary. You decide which normalized course records enter your workspace.</p></div><span className={`mode-pill ${mode}`}>{mode === "seeded" ? "Sanitized playback" : "Live GPT-5.6"}</span></div>
      <div className="ingestion-layout">
        <div className="upload-column">
          <button className={`upload-zone ${file ? "has-file" : ""}`} type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0]); }}>
            <input ref={inputRef} hidden type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(event) => selectFile(event.target.files?.[0])} />
            {file ? <>{file.type === "application/pdf" ? <FileText size={34} /> : <FileImage size={34} />}<strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · ready for temporary processing</span></> : <><Upload size={34} /><strong>Drop a transcript screenshot or PDF</strong><span>PDF, PNG, JPEG, or WebP · up to 8 MB</span></>}
          </button>
          <div className="upload-actions"><Button variant="outline" disabled={!file || working} onClick={() => run("seeded")}>Use seeded playback</Button><Button disabled={!file || working} onClick={() => run("live")}>{working ? <LoaderCircle className="spin" /> : null}Run live extraction</Button></div>
          <div className="privacy-line"><LockKeyhole size={15} />No upload, raw text, prompt, or model response is stored.</div>
          {error ? <div className="inline-error"><AlertTriangle size={17} />{error}{mode === "live" ? <Button size="sm" variant="outline" onClick={() => run("seeded")}>Continue seeded</Button> : null}</div> : null}
        </div>
        <div className="progress-column" aria-live="polite">
          <div className="progress-summary"><span>{completedCount} of 7 stages complete</span><Progress aria-label="Evidence-to-plan progress" value={(completedCount / 7) * 100} /></div>
          <ol className="extraction-steps">{steps.map((step, index) => { const status = statuses[step.stage]; return <motion.li layout={!reduceMotion} className={`extraction-step ${status}`} key={step.stage}><span className="step-number">{status === "complete" ? <Check size={14} /> : status === "active" ? <LoaderCircle size={14} className="spin" /> : index + 1}</span><div><strong>{step.label}</strong>{details[step.stage] ? <span>{details[step.stage]}</span> : null}</div></motion.li>; })}</ol>
        </div>
      </div>
      <AnimatePresence>{extraction ? <motion.div className="extraction-review" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><div className="title-row"><div><span className="eyebrow">Student review</span><h3>{extraction.courses.length} extracted courses</h3><p>Uncertain text stays flagged and does not silently satisfy a requirement.</p></div><Status tone={extraction.reviewFlags.length ? "warning" : "confirmed"} label={`${extraction.reviewFlags.length} review flag${extraction.reviewFlags.length === 1 ? "" : "s"}`} /></div><div className="extracted-course-list">{extraction.courses.map((course) => <div className="extracted-course" key={`${course.sourceCode}-${course.term}`}><div><strong>{course.sourceCode}</strong><span>{course.sourceTitle} · {course.term}</span></div><span>{Math.round(course.confidence * 100)}%</span><Status tone={course.reviewRequired ? "warning" : "confirmed"} label={course.reviewRequired ? "Review" : "Matched"} /></div>)}</div><div className="review-confirm"><p>{committed ? "Confirmed normalized courses are now in the local workspace." : "Confirming stores normalized courses only and runs route validation."}</p><Button disabled={committed || working} onClick={confirmExtraction}>{committed ? <><Check />Profile updated</> : "Confirm courses and generate routes"}</Button></div></motion.div> : null}</AnimatePresence>
    </section>
  );
}
