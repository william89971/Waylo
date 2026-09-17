import { WayloWordmark } from "@/components/waylo-wordmark";

export default function OnboardingLoading() {
  return (
    <main className="onboarding-page" aria-busy="true" aria-live="polite">
      <header className="onboarding-top">
        <WayloWordmark />
      </header>
      <section className="onboarding-panel">
        <div className="onboarding-progress">
          <div>
            <strong>Getting ready</strong>
            <span>Opening your path…</span>
          </div>
          <div className="progress-track">
            <span style={{ width: "20%" }} />
          </div>
        </div>
      </section>
    </main>
  );
}
