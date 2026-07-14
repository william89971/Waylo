"use client";

import Link from "next/link";
import { AlertTriangle, Check, Circle } from "lucide-react";
import type { RouteCandidate } from "@/lib/domain";
import { Status, Tag } from "@/components/ui";

export function RoadmapView({ route, compact = false }: { route: RouteCandidate; compact?: boolean }) {
  if (route.terms.length === 0) {
    return <div className="empty-state panel"><div><Circle size={34} /><h2>No validated route yet</h2><p>Choose a supported pathway or adjust the current constraints.</p></div></div>;
  }
  return (
    <>
      <div className="roadmap-wrap" aria-label={`${route.label} semester roadmap`}>
        <div className="roadmap" style={{ "--term-count": route.terms.length } as React.CSSProperties}>
          {route.terms.map((term) => (
            <section className="term" key={term.id} aria-labelledby={`${route.id}-${term.id}`}>
              <div className="term-heading">
                <span className="term-marker"><Check size={15} strokeWidth={2.2} /></span>
                <span className="term-label" id={`${route.id}-${term.id}`}>{term.label}</span>
              </div>
              <div className="term-units">{term.totalUnits} units</div>
              <div className="term-courses">
                {term.courses.map((course) => (
                  <div className={`course-row ${course.status === "attention" ? "attention" : ""}`} key={course.courseId} title={`${course.code} — ${course.title}`}>
                    <span className="course-title">{compact ? course.title : `${course.code} ${course.title}`}</span>
                    <span className="course-units">{course.units}</span>
                    {course.status === "attention" ? <AlertTriangle size={14} color="var(--amber)" aria-label="Evidence needs review" /> : <Check size={14} color="var(--green)" aria-label="Sequence validated" />}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <div className="roadmap-legend">
        <Status tone="confirmed" label="Sequence validated" />
        <Status tone="planned" label="Planned" />
        <Status tone="warning" label="Evidence review" />
        <Tag>GE</Tag><Tag tone="teal">Major</Tag><Tag tone="purple">Preparation</Tag>
        <Link className="text-link" href="/evidence">View evidence</Link>
      </div>
    </>
  );
}
