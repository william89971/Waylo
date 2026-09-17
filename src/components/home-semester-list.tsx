"use client";

import { useState } from "react";
import { EvidenceStatus } from "@/components/evidence-status";
import { EvidenceDrawer, type CourseEvidencePayload } from "@/components/evidence-drawer";
import type { VerificationTier } from "@/lib/articulation/types";

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
}: {
  courses: HomeSemesterCourse[];
  totalUnits: number;
  termLabel: string;
  evidenceByCourseCode: Record<string, CourseEvidencePayload>;
}) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const selected = courses.find((course) => course.code === selectedCode);
  const evidence = selected
    ? { ...(evidenceByCourseCode[selected.code] ?? {
        courseCode: selected.code,
        courseTitle: selected.title,
        semesterUnits: selected.units,
        campuses: [],
      }), why: selected.why }
    : null;

  return (
    <>
      <figure className="waylo-specimen home-appointment">
        <figcaption>
          <span className="waylo-specimen-kicker">Next semester</span>
          <strong>{termLabel}</strong>
          <span className="waylo-specimen-units">{unitsLabel(totalUnits)} units</span>
        </figcaption>
        <div className="course-table" role="table" aria-label="Recommended semester courses">
          {courses.map((course) => (
            <button
              type="button"
              className="course-row"
              key={course.courseId}
              onClick={() => setSelectedCode(course.code)}
              aria-label={`Why this class? ${course.code} ${course.title}`}
            >
              <strong className="font-mono tabular-nums">{course.code}</strong>
              <span className="course-title">{course.title}</span>
              <span className="tabular-nums course-units">{unitsLabel(course.units)}</span>
              <EvidenceStatus state={course.state} tier={course.tier} />
            </button>
          ))}
        </div>
      </figure>
      <EvidenceDrawer open={selectedCode !== null} evidence={evidence} onClose={() => setSelectedCode(null)} />
    </>
  );
}
