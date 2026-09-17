import type { AdmissionsStrategy } from "@/lib/admissions-strategy";

export function AdmissionsStrategyPanel({ strategy }: { strategy: AdmissionsStrategy }) {
  return (
    <section id="admissions-strategy" className="strategy-section no-print" aria-labelledby="admissions-strategy-title">
      <h2 id="admissions-strategy-title">Admissions strategy — not verified articulation</h2>
      <article className="strategy-block">
        <h3>{strategy.grades.title}</h3>
        <p>{strategy.grades.body}</p>
      </article>
      <article className="strategy-block">
        <h3>{strategy.counselor.title}</h3>
        <ol>
          {strategy.counselor.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </article>
      <p className="strategy-disclaimer">{strategy.disclaimer}</p>
    </section>
  );
}
