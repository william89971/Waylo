import type { CalGetcStanding } from "@/lib/articulation/cal-getc";

export function CalGetcPanel({ areas }: { areas: CalGetcStanding[] }) {
  return (
    <section className="already-counted" aria-labelledby="cal-getc-title">
      <h2 id="cal-getc-title">Cal-GETC / general education</h2>
      <p>Waylo does not certify Cal-GETC. Typical placements are counselor questions, never finished facts.</p>
      <ul>
        {areas.map((area) => (
          <li key={area.areaId}>
            <strong>{area.label}</strong>
            {area.status === "confirm_possible" ? " — possible, confirm" : " — not shown"}
            <span className="cal-getc-note"> {area.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
