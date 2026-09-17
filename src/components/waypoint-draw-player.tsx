import { WaypointO } from "@/components/waypoint-o";

export function WaypointDrawPlayer({
  className = "",
}: {
  className?: string;
  playWhenVisible?: boolean;
}) {
  return (
    <span className={`waypoint-draw ${className}`.trim()} aria-hidden="true">
      <WaypointO className="waylo-o" />
    </span>
  );
}
