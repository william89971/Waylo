"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, Circle, Flag } from "lucide-react";
import type { RouteCandidate } from "@/lib/domain";
import { Status, Tag } from "@/components/ui";

export function RoadmapView({ route, compact = false }: { route: RouteCandidate; compact?: boolean }) {
  const reduceMotion = useReducedMotion();
  if (route.terms.length === 0) {
    return <div className="empty-state panel"><div><Circle size={34} /><h2>No validated route yet</h2><p>Choose a supported pathway or adjust the current constraints.</p></div></div>;
  }
  return (
    <>
      <div className="roadmap-wrap" role="region" tabIndex={0} aria-label={`${route.label} semester roadmap`}>
        <motion.div className="roadmap" layout={!reduceMotion} style={{ "--term-count": route.terms.length } as React.CSSProperties}>
          {route.terms.map((term, termIndex) => (
            <motion.section className="term" layout={!reduceMotion} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: termIndex * 0.045, duration: 0.22 }} key={term.id} aria-labelledby={`${route.id}-${term.id}`}>
              <div className="term-heading">
                <span className="term-marker"><Check size={15} strokeWidth={2.2} /></span>
                <span className="term-label" id={`${route.id}-${term.id}`}>{term.label}</span>
              </div>
              <div className="term-units">{term.totalUnits} units</div>
              <div className="term-courses">
                {term.courses.map((course) => (
                  <motion.div layout={!reduceMotion} className={`course-row ${course.status === "attention" ? "attention" : ""}`} key={course.courseId} title={`${course.code} — ${course.title}`}>
                    <span className="course-title">{compact ? course.title : `${course.code} ${course.title}`}</span>
                    <span className="course-units">{course.units}</span>
                    {course.status === "attention" ? <AlertTriangle size={14} color="var(--amber)" aria-label="Evidence needs review" /> : <Check size={14} color="var(--green)" aria-label="Sequence validated" />}
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}
          <div className="route-destination" aria-hidden="true"><Flag size={15} /></div>
        </motion.div>
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
