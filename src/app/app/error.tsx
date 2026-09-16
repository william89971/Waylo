"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="production-page">
      <header className="production-page-header">
        <h1>This page could not load</h1>
        <p>Your saved courses and plan are still in your account. Try again, or return to your plan.</p>
      </header>
      <div className="production-error" role="alert">Waylo hit an unexpected error while opening this screen.</div>
      <div className="dashboard-actions">
        <button type="button" className="production-button primary" onClick={reset}>
          Try again
        </button>
        <a href="/app/plan" className="production-button">Back to your plan</a>
      </div>
    </div>
  );
}
