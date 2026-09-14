export default function SettingsPage() {
  return (
    <div className="production-page fade-in">
      <header className="production-page-header">
        <h1>Settings</h1>
        <p>Account and privacy controls will appear here after the Preview journey is stable.</p>
      </header>
      <div className="empty-state">
        <strong>Nothing to configure yet</strong>
        <p>For now, manage your transfer targets during onboarding and keep using your signed-in account to return to your plan.</p>
      </div>
    </div>
  );
}
