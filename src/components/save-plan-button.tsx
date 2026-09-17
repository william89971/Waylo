"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RouteStrategy } from "@/lib/domain";

export function SavePlanButton({ strategy }: { strategy: RouteStrategy }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/me/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", strategy }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error?.message ?? "Waylo could not save this plan.");
        return;
      }
      router.push("/app?saved=1");
      router.refresh();
    } catch {
      setError("Waylo could not save this plan.");
    } finally {
      setWorking(false);
    }
  };
  return (
    <span className="plan-save">
      <button type="button" className="production-button primary" onClick={() => void save()} disabled={working}>
        {working ? "Saving…" : "Save plan"}
      </button>
      {error ? <p className="production-error" role="alert">{error}</p> : null}
    </span>
  );
}
