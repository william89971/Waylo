"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export function LocalAuthCard({ mode }: { mode: "sign-in" | "sign-up" }) {
  const searchParams = useSearchParams();
  const [working, setWorking] = useState(false);
  const submit = async () => {
    setWorking(true);
    const testUser = searchParams.get("testUser") ?? "test-student-primary";
    const response = await fetch("/api/test-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testUser }) });
    if (response.ok) window.location.assign(mode === "sign-up" ? "/onboarding" : "/app");
    else setWorking(false);
  };
  return (
    <div className="auth-card">
      <div className="brand-word production-brand">Waylo</div>
      <h1>{mode === "sign-up" ? "Create your Waylo account" : "Welcome back"}</h1>
      <p>Local test authentication is enabled. Production uses secure passwordless email and Google sign-in through Clerk.</p>
      <button className="production-button primary" onClick={() => void submit()} disabled={working}>
        {working ? "Opening Waylo…" : mode === "sign-up" ? "Create test account" : "Continue as test student"}
      </button>
    </div>
  );
}
