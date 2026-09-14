import Link from "next/link";
import { ArrowRight, CalendarCheck, FileCheck2, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="production-landing">
      <nav className="production-landing-nav" aria-label="Main navigation">
        <Link href="/" className="production-brand">Waylo</Link>
        <div className="production-nav-actions"><Link href="/sign-in" className="production-text-link">Sign in</Link><Link href="/sign-up" className="production-button primary">Build your plan</Link></div>
      </nav>
      <section className="production-hero">
        <div>
          <p className="hero-eyebrow">College of the Canyons → UC / CSU / private transfer planning</p>
          <h1>Know what to take next semester.</h1>
          <p>Enter your College of the Canyons history, choose universities and majors, and get an evidence-backed semester plan you can take to a counselor.</p>
          <div className="production-hero-actions"><Link href="/sign-up" className="production-button primary">Build your transfer plan <ArrowRight size={17} /></Link><Link href="/sign-in" className="production-button">Return to your plan</Link></div>
          <p className="production-disclaimer">Waylo is a planning aid. Confirm uncertain articulations in ASSIST or with a counselor before enrollment decisions.</p>
        </div>
        <div className="promise-list" aria-label="How Waylo helps">
          <div><FileCheck2 aria-hidden="true" /><span><strong>Start with your history</strong><small>You review every course before it is saved.</small></span></div>
          <div><CalendarCheck aria-hidden="true" /><span><strong>See the next semester</strong><small>Prerequisites and unit limits shape the recommendation.</small></span></div>
          <div><ShieldCheck aria-hidden="true" /><span><strong>Trace every claim</strong><small>Verified facts stay distinct from planning suggestions and review items.</small></span></div>
        </div>
      </section>
    </main>
  );
}
