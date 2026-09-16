export default function AppLoading() {
  return (
    <div className="production-page fade-in" aria-busy="true" aria-live="polite">
      <div className="skeleton" style={{ height: 34, width: "42%", marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 18, width: "64%", marginBottom: 28 }} />
      <div className="skeleton" style={{ height: 220, width: "100%", marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 120, width: "100%" }} />
      <p className="onboarding-hint" style={{ marginTop: 18 }}>Loading your plan…</p>
    </div>
  );
}
