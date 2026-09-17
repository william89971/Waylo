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
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [extraction, setExtraction] = useState<TranscriptExtraction | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const extract = async () => {
    if (!text.trim()) {
      setError("Paste the course lines from your transcript first.");
      return;
    }
    setWorking(true);
    setError("");
    setExtraction(null);
    try {
      const form = new FormData();
      form.set("mode", "seeded");
      form.set("text", text);
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
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not save those classes.");
    } finally {
      setWorking(false);
    }
  };

  if (!open && !extraction) {
    return (
      <button type="button" className="production-text-link" onClick={() => setOpen(true)}>
        Paste a transcript
      </button>
    );
  }

  return (
    <div className="transcript-import" data-testid="transcript-import">
      <p className="onboarding-hint">Nothing is added to your plan until you confirm the rows below.</p>
      <label>
        Paste transcript text
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder="ENGL C1000 Academic Reading and Writing A Fall 2025"
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
