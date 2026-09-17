"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WayloWordmark } from "@/components/waylo-wordmark";

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
      <WayloWordmark href="/" />
      <h1>{mode === "sign-up" ? "Sign up" : "Sign in"}</h1>
      <p>
        {mode === "sign-up"
          ? "Create an account to turn your College of the Canyons classes into a next-semester list."
          : "Continue to your next-semester list. Local test authentication is on in this environment."}
      </p>
      <button className="production-button primary" onClick={() => void submit()} disabled={working}>
        {working ? "Opening…" : mode === "sign-up" ? "Create test account" : "Continue as test student"}
      </button>
      <Link href="/" className="production-text-link auth-back">
        Back to Waylo
      </Link>
    </div>
  );
}
