"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ProductionRouteOption } from "@/lib/production-routes";

export function PlanRoutePicker({ options }: { options: ProductionRouteOption[] }) {
  const router = useRouter();
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  if (options.length < 2) return null;

  const choose = async (option: ProductionRouteOption) => {
    if (option.selected || workingId) return;
    setWorkingId(option.id);
    setError("");
    try {
      const response = await fetch("/api/me/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "choose_route",
          maxUnits: option.knobs.maxUnits,
          summerEnrollment: option.knobs.summerEnrollment,
          includeSecondaryDivergence: option.knobs.includeSecondaryDivergence,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Waylo could not save that route.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not save that route.");
    } finally {
      setWorkingId("");
    }
  };

  return (
    <section className="route-picker no-print" id="routes" aria-label="Plan routes">
      <div className="section-heading">
        <h2>Routes</h2>
        <p>Pick one. Waylo remembers it on Home and All terms.</p>
      </div>
      <div className="selection-group" role="radiogroup" aria-label="Plan routes">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.selected}
            className={`selection-row ${option.selected ? "selected" : ""}`}
            disabled={Boolean(workingId)}
            onClick={() => void choose(option)}
          >
            <span>
              <strong>{workingId === option.id ? "Saving…" : option.title}</strong>
              <small>
                <span className="font-mono tabular-nums">
                  {option.nextTermCodes.length
                    ? `${option.nextTermLabel} · ${option.nextTermCodes.join(" · ")} · ${option.nextTermUnits.toFixed(1)} units`
                    : `${option.nextTermLabel} · no classes scheduled`}
                </span>
                <span>
                  Finishes {option.finishTerm}
                  {option.summerTerm ? ` · includes ${option.summerTerm}` : ""}
                  {option.targetTerm
                    ? option.reachesTarget
                      ? ` · by ${option.targetTerm}`
                      : ` · after ${option.targetTerm}`
                    : ""}
                </span>
              </small>
            </span>
            {option.selected ? <Check /> : null}
          </button>
        ))}
      </div>
      {error ? (
        <p className="production-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
