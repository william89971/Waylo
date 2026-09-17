import type { CalGetcStanding } from "@/lib/articulation/cal-getc";

export function CalGetcPanel({ areas }: { areas: CalGetcStanding[] }) {
  const possible = areas.filter((area) => area.status === "confirm_possible");
  return (
    <section className="already-counted" aria-labelledby="cal-getc-title">
      <h2 id="cal-getc-title">Cal-GETC / general education</h2>
      <p>Waylo does not certify Cal-GETC. Typical placements are counselor questions, never finished facts.</p>
      {possible.length ? (
        <ul>
          {possible.map((area) => (
            <li key={area.areaId}>
              <strong>{area.label}</strong> — possible, confirm
            </li>
          ))}
        </ul>
      ) : (
        <p>No listed course on your record is a typical placement. Ask a counselor which Cal-GETC classes still apply.</p>
      )}
    </section>
  );
}
