import { WaypointO } from "@/components/waypoint-o";

export function LandingStagePlayer({ className = "" }: { className?: string }) {
  return (
    <div className={`waylo-stage-motion ${className}`.trim()} aria-hidden="true">
      <span className="stage-o-drift a">
        <WaypointO className="stage-o-ring" />
      </span>
      <span className="stage-o-drift b">
        <WaypointO className="stage-o-ring" />
      </span>
    </div>
  );
}
