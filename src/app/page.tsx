import Link from "next/link";
import { ArrowRight, Check, Compass, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Landing navigation">
        <Link href="/" className="landing-brand">Waylo</Link>
        <Link href="/overview" className="button primary">Open seeded demo <ArrowRight size={17} /></Link>
      </nav>
      <section className="landing-hero">
        <div className="landing-copy">
          <h1>Find your way through college.</h1>
          <p>Waylo helps community-college students compare transfer pathways, build semester-by-semester routes, spot planning risks, and see what changes before they change their plan.</p>
          <div className="cluster">
            <Link href="/overview" className="button primary">Explore your academic routes <ArrowRight size={17} /></Link>
            <Link href="/pathways" className="button">See six pathways</Link>
          </div>
          <div className="landing-note"><ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Seeded demo data. Review academic plans with a counselor.</div>
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
        </div>
      </section>
    </main>
  );
}
