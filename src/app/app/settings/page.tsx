import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="production-page">
      <header className="production-page-header">
        <h1>Settings</h1>
        <p>No account settings yet.</p>
      </header>
      <p className="onboarding-hint">Your courses, majors, and plan are in the other tabs.</p>
      <Link href="/app/plan" className="production-button">
        Back to your plan
      </Link>
    </div>
  );
}
