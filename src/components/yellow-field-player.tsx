import { WaypointO } from "@/components/waypoint-o";

export function YellowFieldPlayer({ className = "" }: { className?: string }) {
  return (
    <div className={`yellow-field-motion ${className}`.trim()} aria-hidden="true">
      <WaypointO className="stage-o-ring" />
    </div>
  );
}
