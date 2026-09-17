"use client";

import { useState } from "react";
import type { AdmissionsStrategy } from "@/lib/admissions-strategy";

export function AdmissionsStrategyPanel({ strategy }: { strategy: AdmissionsStrategy }) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<number | null>(null);

  const copyItem = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
    } catch {
      setCopied(null);
    }
  };

  return (
    <section id="admissions-strategy" className="strategy-section no-print" aria-labelledby="admissions-strategy-title">
      <h2 id="admissions-strategy-title">Admissions strategy — not verified articulation</h2>
      {strategy.missingGradeWarning ? (
        <p className="strategy-warning" role="status">
          {strategy.missingGradeWarning}
        </p>
      ) : null}
      <article className="strategy-block">
        <h3>{strategy.counselor.title}</h3>
        <ol className="strategy-tasks">
          {strategy.counselor.items.map((item, index) => (
            <li key={item}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(done[index])}
                  onChange={() => setDone((current) => ({ ...current, [index]: !current[index] }))}
                />
                <span>{item}</span>
              </label>
              <button type="button" className="strategy-copy" onClick={() => void copyItem(index, item)}>
                {copied === index ? "Copied" : "Copy"}
              </button>
            </li>
          ))}
        </ol>
      </article>
      <p className="strategy-disclaimer">{strategy.disclaimer}</p>
    </section>
  );
}
