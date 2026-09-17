"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LandingTeaserData } from "@/lib/landing-teaser";

export function LandingTargetTeaser({
  data,
  ctaHref = "/sign-up",
  ctaLabel,
}: {
  data: LandingTeaserData;
  ctaHref?: string;
  ctaLabel: string;
}) {
  const defaultMajor = data.majors.find((major) => major.id === data.defaultTargetId) ?? data.majors[0];
  const [institutionId, setInstitutionId] = useState(defaultMajor?.institutionId ?? "");
  const [majorId, setMajorId] = useState(defaultMajor?.id ?? "");

  const majors = useMemo(
    () => data.majors.filter((major) => major.institutionId === institutionId),
    [data.majors, institutionId],
  );
  const selectedMajor = majors.find((major) => major.id === majorId) ?? majors[0];

  return (
    <div className="landing-teaser">
      <div className="landing-teaser-picks">
        <label>
          <span>School</span>
          <select
            name="target-school"
            aria-label="School"
            value={institutionId}
            onChange={(event) => {
              const nextSchool = event.target.value;
              const nextMajor = data.majors.find((major) => major.institutionId === nextSchool);
              setInstitutionId(nextSchool);
              setMajorId(nextMajor?.id ?? "");
            }}
          >
            {data.schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Major</span>
          <select
            name="target-major"
            aria-label="Major"
            value={selectedMajor?.id ?? ""}
            onChange={(event) => setMajorId(event.target.value)}
          >
            {majors.map((major) => (
              <option key={major.id} value={major.id}>
                {major.major}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selectedMajor?.courses.length ? (
        <ol className="landing-teaser-preview" aria-live="polite">
          {selectedMajor.courses.map((course) => (
            <li key={course.code}>
              <strong className="font-mono tabular-nums">{course.code}</strong>
              <span>{course.title}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="landing-teaser-empty">Confirm remaining major prep with a counselor.</p>
      )}
      <div id="sign-up" className="production-hero-actions">
        <Link href={ctaHref} className="production-button primary">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
