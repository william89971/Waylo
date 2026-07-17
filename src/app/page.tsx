import Link from "next/link";
import { ArrowRight, Check, Compass, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Landing navigation">
        <Link href="/" className="landing-brand">Waylo</Link>
        <Link href="/judge-tour?fresh=1" className="button primary">Start the 2-minute judge tour <ArrowRight size={17} /></Link>
      </nav>
      <section className="landing-hero">
        <div className="landing-copy">
          <h1>See what changes before you change your plan.</h1>
          <p>Waylo turns transcripts, transfer requirements, and real-life constraints into validated academic routes you can review with a counselor.</p>
          <p className="landing-positioning">An evidence-grounded academic decision simulator for community-college transfer students.</p>
          <div className="cluster">
            <Link href="/judge-tour?fresh=1" className="button primary">Start the 2-minute judge tour <ArrowRight size={17} /></Link>
            <Link href="/overview" className="button">Open the full seeded app</Link>
          </div>
          <div className="landing-note"><ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Seeded College of the Canyons example. Recorded GPT-5.6 demo results are labeled. No OpenAI request is made in the judge tour.</div>
        </div>
        <div className="landing-preview panel" aria-label="Preview of Waylo's semester roadmap">
          <div className="preview-bar"><span className="preview-title">Your route to UCLA</span><span className="status confirmed"><span className="status-icon"><Check size={14} /></span>On track</span></div>
          <div className="preview-map">
            {[
              ["Fall 2026", ["Precalculus", "Statistics"]],
              ["Spring 2027", ["Calculus I", "Data Structures"]],
              ["Fall 2027", ["Calculus II", "Discrete Structures"]],
              ["Spring 2028", ["Calculus III", "Linear Algebra"]],
            ].map(([term, items]) => (
              <div className="preview-term" key={term as string}>
                <strong>{term as string}</strong>
                <div className="preview-courses">{(items as string[]).map((item) => <span className="preview-course" key={item}><Compass size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />{item}</span>)}</div>
              </div>
            ))}
          </div>
          <div className="preview-consequence"><span>Test a change</span><strong>Calculus I moves → four milestones shift</strong><small>Saved baseline stays protected until human confirmation.</small></div>
        </div>
      </section>
    </main>
  );
}
