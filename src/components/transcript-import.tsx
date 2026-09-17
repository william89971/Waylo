"use client";

import { useState } from "react";
import { rematchTranscriptExtraction, externalCatalogId } from "@/lib/articulation/transcript-match";
import type { TranscriptExtraction } from "@/lib/domain";
import type { ProductionCourse } from "@/lib/production-types";

async function jsonRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Waylo could not finish that step.");
  return body;
}

export function TranscriptImport({
  existingCourseIds,
  onConfirmed,
}: {
  existingCourseIds: string[];
  onConfirmed: (courses: ProductionCourse[]) => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | undefined>();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [extraction, setExtraction] = useState<TranscriptExtraction | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const extract = async () => {
    if (!text.trim() && !file) {
      setError("Paste transcript text or choose a PDF or image first.");
      return;
    }
    setWorking(true);
    setError("");
    setExtraction(null);
    try {
      const form = new FormData();
      form.set("mode", "seeded");
      if (file) form.set("file", file);
      else form.set("text", text);
      const response = await fetch("/api/transcripts/extract", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? body?.message ?? "Waylo could not read that transcript.");
      setExtraction(rematchTranscriptExtraction(body.extraction));
      setExcluded(new Set());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not read that transcript.");
    } finally {
      setWorking(false);
    }
  };

  const confirm = async () => {
    if (!extraction) return;
    const rows = extraction.courses.filter((_, index) => !excluded.has(index));
    if (!rows.length) {
      setError("Select at least one row to save.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const payload = rows.map((row) => ({
        catalogCourseId: row.normalizedCourseId ?? externalCatalogId(row.sourceCode, row.sourceTitle),
        code: row.sourceCode,
        title: row.sourceTitle,
        units: row.units,
        grade: row.grade,
        term: row.term,
        status: "completed" as const,
        source: row.normalizedCourseId?.startsWith("ap:")
          ? "ap"
          : row.normalizedCourseId
            ? "transcript"
            : "other_college",
      }));
      const body = await jsonRequest("/api/me/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courses: payload }),
      });
      onConfirmed(body.courses as ProductionCourse[]);
      setExtraction(null);
      setText("");
      setFile(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not save those classes.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="transcript-import" data-testid="transcript-import">
      <h2 className="onboarding-subheading">Import a transcript</h2>
      <p className="onboarding-hint">
        Nothing is added to your plan until you confirm the rows below. Unmatched classes stay unmatched.
      </p>
      <label>
        Paste course lines
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setFile(undefined);
          }}
          rows={4}
          placeholder="ENGL C1000 Academic Reading and Writing A Fall 2025"
        />
      </label>
      <label className="transcript-file">
        Or upload a PDF or image
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(event) => {
            setFile(event.target.files?.[0]);
            setText("");
          }}
        />
      </label>
      <button type="button" className="production-button" disabled={working} onClick={() => void extract()}>
        {working && !extraction ? "Reading…" : "Read transcript"}
      </button>

      {error ? (
        <div className="production-error" role="alert">
          {error}
        </div>
      ) : null}

      {extraction ? (
        <div className="transcript-confirm" data-testid="transcript-confirm">
          <h3>Confirm these classes</h3>
          <p>Review every row. Unchecked rows are discarded. Confirmed rows are saved to your record after this step.</p>
          <ul>
            {extraction.courses.map((row, index) => {
              const already = Boolean(row.normalizedCourseId && existingCourseIds.includes(row.normalizedCourseId));
              const matched = Boolean(row.normalizedCourseId && !row.normalizedCourseId.startsWith("ext:"));
              return (
                <li key={`${row.sourceCode}-${index}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!excluded.has(index)}
                      onChange={() => {
                        setExcluded((current) => {
                          const next = new Set(current);
                          if (next.has(index)) next.delete(index);
                          else next.add(index);
                          return next;
                        });
                      }}
                    />
                    <span>
                      <strong className="font-mono tabular-nums">{row.sourceCode}</strong> {row.sourceTitle}
                      <small>
                        {row.term} · {row.grade || "Grade not shown"} ·{" "}
                        {matched ? "College of the Canyons match" : "Unmatched — counselor confirmation required"}
                        {already ? " · already on your record" : ""}
                      </small>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {extraction.reviewFlags.length ? (
            <p className="onboarding-hint">{extraction.reviewFlags[0]}</p>
          ) : null}
          <div className="onboarding-actions">
            <button type="button" className="production-button" onClick={() => setExtraction(null)}>
              Discard
            </button>
            <button type="button" className="production-button primary" disabled={working} onClick={() => void confirm()}>
              {working ? "Saving…" : "Confirm and add to my record"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
