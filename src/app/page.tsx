import Link from "next/link";
import { LandingTargetTeaser } from "@/components/landing-target-teaser";
import { LandingStagePlayer } from "@/components/landing-stage-player";
import { WayloWordmark } from "@/components/waylo-wordmark";
import { WaypointO } from "@/components/waypoint-o";
import { loadActiveArticulationGraph } from "@/lib/articulation/load-graph";
import {
  buildLandingSpecimen,
  buildLandingTeaser,
  LANDING_CTA_LABEL,
  landingCoverageLine,
} from "@/lib/landing-teaser";
import { MULTI_TARGET_DATA_RELEASE } from "@/lib/server/production-planning";

const path = [
  {
    index: "01",
    label: "Your classes",
    note: "Paste or upload a transcript, or pick from a list.",
  },
  {
    index: "02",
    label: "What they count for",
    note: "Official ASSIST agreements, or ask a counselor.",
  },
  {
    index: "03",
    label: "What to take next",
    note: "A next-semester list, with units.",
  },
] as const;

export default async function LandingPage() {
  const graph = await loadActiveArticulationGraph();
  const teaser = buildLandingTeaser(graph);
  const specimen = buildLandingSpecimen(graph);
  const coverage = landingCoverageLine(graph, MULTI_TARGET_DATA_RELEASE);

  return (
    <main className="production-landing">
      <a href="#sign-up" className="skip-link">
        Skip to build your list
      </a>
      <nav className="production-landing-nav" aria-label="Main navigation">
        <div className="production-landing-nav-inner">
          <WayloWordmark href="/" />
          <div className="production-nav-actions">
            <Link href="/sign-in" className="production-text-link">
              Sign in
            </Link>
            <Link href="/sign-up" className="production-button primary">
              {LANDING_CTA_LABEL}
            </Link>
          </div>
        </div>
      </nav>
      <section className="production-hero">
        <p className="production-kicker">
          <WaypointO className="kicker-o" />
          College of the Canyons · transfer
        </p>
        <p className="production-coverage">{coverage}</p>
        <h1>Know what to take next semester.</h1>
        <p className="production-lede">
          ASSIST is the official map, and it is a maze. Waylo reads those agreements and hands you a next-semester
          list for the universities you are planning toward. Bring it to a College of the Canyons counselor before you
          enroll.
        </p>
        <LandingTargetTeaser data={teaser} ctaLabel={LANDING_CTA_LABEL} />
      </section>
      <div className="waylo-stage">
        <LandingStagePlayer />
        <aside className="waylo-stage-satellite left" aria-hidden="true">
          <p>Your classes</p>
          <ul>
            {specimen.courses.map((course) => (
              <li key={course.code}>
                <strong className="font-mono tabular-nums">{course.code}</strong>
              </li>
            ))}
          </ul>
        </aside>
        <aside className="waylo-stage-satellite right" aria-hidden="true">
          <p>{specimen.term}</p>
          <em className="verified">Official agreement</em>
          <em className="review">Ask a counselor</em>
        </aside>
        <section className="waylo-well" aria-label="Sample next semester">
          <figure className="waylo-specimen">
            <figcaption>
              <span className="waylo-specimen-target">{specimen.destination}</span>
              <span className="waylo-specimen-kicker">Next semester</span>
              <strong>{specimen.term}</strong>
              <span className="waylo-specimen-units">{specimen.unitsLabel}</span>
            </figcaption>
            <ol>
              {specimen.courses.map((course) => (
                <li key={course.code}>
                  <strong className="font-mono tabular-nums">{course.code}</strong>
                  <span className="waylo-specimen-copy">
                    {course.title}
                    {course.overlap ? <small>{course.overlapLabel ?? course.overlap}</small> : null}
                  </span>
                  <span className="tabular-nums">{course.units}</span>
                  <em className={course.status}>{course.statusLabel}</em>
                </li>
              ))}
            </ol>
          </figure>
        </section>
      </div>
      <ol className="waylo-path" aria-label="How Waylo works">
        {path.map((step) => (
          <li key={step.index}>
            <span className="waylo-path-mark">
              <WaypointO className="waylo-path-o" />
              <span className="waylo-path-index">{step.index}</span>
            </span>
            <span className="waylo-path-copy">
              <strong className="waylo-path-label">{step.label}</strong>
              <span className="waylo-path-note">{step.note}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="production-disclaimer">
        Engineered to match official ASSIST.org articulations — verified side-by-side with your COC counselor.
      </p>
    </main>
  );
}
