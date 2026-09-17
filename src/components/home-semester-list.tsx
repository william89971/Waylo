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

export function HomeSemesterList({
  courses,
  totalUnits,
  evidenceByCourseCode,
}: {
  courses: HomeSemesterCourse[];
  totalUnits: number;
  evidenceByCourseCode: Record<string, CourseEvidencePayload>;
}) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const evidence = selectedCode ? evidenceByCourseCode[selectedCode] ?? null : null;

  return (
    <>
      <div className="course-table" role="table" aria-label="Recommended semester courses">
        {courses.map((course) => {
          const sourceUrl = course.state === "verified" ? course.sourceUrl : undefined;
          return (
            <div className="course-row" role="row" key={course.courseId}>
              <div className="course-identity">
                <strong className="font-mono tabular-nums">{course.code}</strong>
                <small>
                  {course.title} · {course.units} units
                </small>
                <p className="course-why">{course.why}</p>
              </div>
              <EvidenceStatus state={course.state} tier={course.tier} />
              <div className="course-row-actions">
                <button type="button" className="production-text-link" onClick={() => setSelectedCode(course.code)}>
                  Why this class?
                </button>
                {sourceUrl && course.sourceLabel ? (
                  <a href={sourceUrl} target="_blank" rel="noreferrer">
                    {course.sourceLabel}
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
        <div className="course-total">
          <span>Total</span>
          <strong>{totalUnits} planned units</strong>
        </div>
      </div>
      <EvidenceDrawer open={selectedCode !== null} evidence={evidence} onClose={() => setSelectedCode(null)} />
    </>
  );
}
