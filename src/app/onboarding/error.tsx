"use client";

import Link from "next/link";

export default function OnboardingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="onboarding-page">
      <header className="onboarding-top">
        <Link href="/" className="production-brand">Waylo</Link>
      </header>
      <section className="onboarding-panel">
        <h1>This setup page could not load</h1>
        <p className="onboarding-hint">Your saved courses are still in your account if you already added them.</p>
        <div className="production-error" role="alert">Waylo hit an unexpected error while opening onboarding.</div>
        <div className="onboarding-actions">
          <button type="button" className="production-button primary" onClick={reset}>Try again</button>
          <Link href="/app" className="production-button">Back to Waylo</Link>
        </div>
      </section>
    </main>
  );
}
