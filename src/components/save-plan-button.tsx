"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RouteStrategy } from "@/lib/domain";

export function SavePlanButton({ strategy }: { strategy: RouteStrategy }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setWorking(true); setError("");
    const response = await fetch("/api/me/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", strategy }) });
    const body = await response.json();
    if (!response.ok) { setError(body?.error?.message ?? "Waylo could not save this plan."); setWorking(false); return; }
    router.push("/app?saved=1"); router.refresh();
  };
  return <div><button type="button" className="production-button primary" onClick={() => void save()} disabled={working}>{working ? "Saving plan…" : "Save this plan"}</button>{error ? <p className="production-error" role="alert">{error}</p> : null}</div>;
}
