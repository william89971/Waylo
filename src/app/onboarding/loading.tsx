export default function OnboardingLoading() {
  return (
    <main className="onboarding-page" aria-busy="true" aria-live="polite">
      <header className="onboarding-top">
        <span className="production-brand">Waylo</span>
      </header>
      <section className="onboarding-panel">
        <div className="onboarding-progress">
          <div>
            <strong>Getting ready</strong>
            <span>Loading your setup…</span>
          </div>
          <div className="progress-track">
            <span style={{ width: "20%" }} />
          </div>
        </div>
      </section>
    </main>
  );
}
