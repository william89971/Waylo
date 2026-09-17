import Link from "next/link";
import { WayloWordmark } from "@/components/waylo-wordmark";
import { WaypointO } from "@/components/waypoint-o";
import { LandingStagePlayer } from "@/components/landing-stage-player";

const path = [
  {
    index: "01",
    label: "Your classes",
    note: "What is already on your College of the Canyons record.",
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

export default function LandingPage() {
  return (
    <main className="production-landing">
      <a href="#sign-up" className="skip-link">
        Skip to sign up
      </a>
      <nav className="production-landing-nav" aria-label="Main navigation">
        <div className="production-landing-nav-inner">
          <WayloWordmark href="/" />
          <div className="production-nav-actions">
            <Link href="/sign-in" className="production-text-link">
              Sign in
            </Link>
            <Link href="/sign-up" className="production-button primary">
              Sign up
            </Link>
          </div>
        </div>
      </nav>
      <section className="production-hero">
        <p className="production-kicker">
          <WaypointO className="kicker-o" />
          College of the Canyons · transfer
        </p>
        <h1>Know what to take next semester.</h1>
        <p className="production-lede">
          ASSIST is the official map, and it is a maze. Waylo reads those agreements and hands you a next-semester
          list for the universities you are planning toward. Bring it to a College of the Canyons counselor before you
          enroll.
        </p>
        <div id="sign-up" className="production-hero-actions">
          <Link href="/sign-up" className="production-button primary">
            Sign up
          </Link>
        </div>
      </section>
      <div className="waylo-stage">
        <LandingStagePlayer />
        <aside className="waylo-stage-satellite left" aria-hidden="true">
          <p>Your classes</p>
          <ul>
            <li>
              <strong className="font-mono tabular-nums">CHEM-201</strong>
            </li>
            <li>
              <strong className="font-mono tabular-nums">MATH-211</strong>
            </li>
            <li>
              <strong className="font-mono tabular-nums">ENGL-103</strong>
            </li>
          </ul>
        </aside>
        <aside className="waylo-stage-satellite right" aria-hidden="true">
          <p>Fall 2026</p>
          <em className="verified">Official agreement</em>
          <em className="review">Ask a counselor</em>
        </aside>
        <section className="waylo-well" aria-label="Sample next semester">
          <figure className="waylo-specimen">
            <figcaption>
              <span className="waylo-specimen-kicker">Next semester</span>
              <strong>Fall 2026</strong>
              <span className="waylo-specimen-units">13.0 COC units</span>
            </figcaption>
            <ol>
              <li>
                <strong className="font-mono tabular-nums">CHEM-201</strong>
                <span>General Chemistry I</span>
                <span className="tabular-nums">5.0</span>
                <em className="verified">Official agreement</em>
              </li>
              <li>
                <strong className="font-mono tabular-nums">MATH-211</strong>
                <span>Calculus I</span>
                <span className="tabular-nums">5.0</span>
                <em className="verified">Official agreement</em>
              </li>
              <li>
                <strong className="font-mono tabular-nums">ENGL-103</strong>
                <span>Critical Reading, Writing and Thinking</span>
                <span className="tabular-nums">3.0</span>
                <em className="review">Ask a counselor</em>
              </li>
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
        Waylo is a planning aid, not an official degree audit. Confirm anything marked for review in ASSIST or with
        a counselor before you enroll.
      </p>
    </main>
  );
}
