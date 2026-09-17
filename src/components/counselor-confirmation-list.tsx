import type { CounselorConfirmationItem } from "@/lib/articulation/counselor-confirmation";

export function CounselorConfirmationList({ items }: { items: CounselorConfirmationItem[] }) {
  if (!items.length) return null;
  return (
    <section className="counselor-confirm" aria-labelledby="counselor-confirm-title">
      <h2 id="counselor-confirm-title">Counselor confirmation required</h2>
      <p>
        These items stay pending until a counselor or the university confirms them. Waylo does not treat them as
        satisfied.
      </p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
