import type { CalGetcStanding } from "@/lib/articulation/cal-getc";

export function CalGetcPanel({ areas }: { areas: CalGetcStanding[] }) {
  const possible = areas.filter((area) => area.status === "confirm_possible");
  return (
    <section className="already-counted" aria-labelledby="cal-getc-title">
      <h2 id="cal-getc-title">Cal-GETC / general education</h2>
      <p>Waylo does not certify Cal-GETC.</p>
      {possible.length ? (
        <ul>
          {possible.map((area) => (
            <li key={area.areaId}>
              {area.label} — confirm
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
