"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EvidenceStatus } from "@/components/evidence-status";
import { EvidenceDrawer, type CourseEvidencePayload } from "@/components/evidence-drawer";
import type { VerificationTier } from "@/lib/articulation/types";
import {
  blockedNextTermChipLabel,
  type BlockedNextTermPlacement,
} from "@/lib/next-term-blocks";

export type HomeSemesterCourse = {
  courseId: string;
  code: string;
  title: string;
  units: number;
  why: string;
  state: "verified" | "suggestion" | "review";
  tier?: VerificationTier;
  sourceUrl?: string;
  sourceLabel?: string;
};

function unitsLabel(units: number) {
  return Number.isInteger(units) ? units.toFixed(1) : String(units);
}

export function HomeSemesterList({
  courses,
  totalUnits,
  termLabel,
  evidenceByCourseCode,
  blocked = [],
}: {
  courses: HomeSemesterCourse[];
  totalUnits: number;
  termLabel: string;
  evidenceByCourseCode: Record<string, CourseEvidencePayload>;
  blocked?: BlockedNextTermPlacement[];
}) {
  const router = useRouter();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [workingCode, setWorkingCode] = useState("");
  const [error, setError] = useState("");
  const selected = courses.find((course) => course.code === selectedCode);
  const evidence = selected
    ? { ...(evidenceByCourseCode[selected.code] ?? {
        courseCode: selected.code,
        courseTitle: selected.title,
        semesterUnits: selected.units,
        campuses: [],
      }), why: selected.why }
    : null;

  const postBlock = async (action: "block_next_term" | "unblock_next_term", code: string) => {
    if (workingCode) return;
    setWorkingCode(code);
    setError("");
    try {
      const response = await fetch("/api/me/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, code }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Waylo could not update next semester.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not update next semester.");
    } finally {
      setWorkingCode("");
    }
  };

  return (
    <>
      <figure className="waylo-specimen home-appointment">
        <figcaption>
          <span className="waylo-specimen-kicker">Next semester</span>
          <strong>{termLabel}</strong>
          <span className="waylo-specimen-units">{unitsLabel(totalUnits)} units</span>
        </figcaption>
        {blocked.length ? (
          <ul className="next-term-blocks" aria-label="Classes not this term">
            {blocked.map((placement) => (
              <li key={placement.code}>
                <span className="font-mono tabular-nums">{blockedNextTermChipLabel(placement)}</span>
                <button
                  type="button"
                  className="next-term-block-undo"
                  disabled={Boolean(workingCode)}
                  onClick={() => postBlock("unblock_next_term", placement.code)}
                  aria-label={`Take it after all: ${placement.code}`}
                >
                  Take it after all
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="course-table" role="table" aria-label="Recommended semester courses">
          {courses.length ? (
            courses.map((course) => (
              <div className="course-row" key={course.courseId} role="row">
                <button
                  type="button"
                  className="course-why"
                  onClick={() => setSelectedCode(course.code)}
                  aria-label={`Why this class? ${course.code} ${course.title}`}
                >
                  <strong className="font-mono tabular-nums">{course.code}</strong>
                  <span className="course-title">{course.title}</span>
                  <span className="tabular-nums course-units">{unitsLabel(course.units)}</span>
                  <EvidenceStatus state={course.state} tier={course.tier} />
                </button>
                <button
                  type="button"
                  className="course-block"
                  disabled={Boolean(workingCode)}
                  onClick={() => postBlock("block_next_term", course.code)}
                  aria-label={`Can't take this: ${course.code}`}
                >
                  Can&apos;t take this
                </button>
              </div>
            ))
          ) : (
            <p className="next-term-empty">No classes this term.</p>
          )}
        </div>
        {error ? (
          <p className="production-error" role="alert">
            {error}
          </p>
        ) : null}
      </figure>
      <EvidenceDrawer open={selectedCode !== null} evidence={evidence} onClose={() => setSelectedCode(null)} />
    </>
  );
}
