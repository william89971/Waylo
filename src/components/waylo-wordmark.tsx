import Link from "next/link";

function Mark() {
  return (
    <span className="waylo-wordmark" aria-hidden="true">
      <span className="waylo-letters">Wayl</span>
      <span className="waylo-o" />
    </span>
  );
}

export function WayloWordmark({
  href,
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  if (!href) {
    return (
      <span className={`production-brand ${className}`.trim()} aria-label="Waylo" role="img">
        <Mark />
      </span>
    );
  }

  return (
    <Link href={href} className={`production-brand ${className}`.trim()} aria-label="Waylo">
      <Mark />
    </Link>
  );
}
