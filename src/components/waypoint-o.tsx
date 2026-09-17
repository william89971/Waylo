import type { CSSProperties } from "react";

const VIEW = 32;
const CX = 16;
const CY = 16;
const RADIUS = 10.5;
const GAP = 0.18;

export function waypointRingMetrics(radius = RADIUS) {
  const circumference = 2 * Math.PI * radius;
  const visible = circumference * (1 - GAP);
  return { circumference, visible };
}

export function WaypointO({
  size,
  color = "currentColor",
  progress = 1,
  strokeWidth = 3.15,
  className = "",
}: {
  size?: number;
  color?: string;
  progress?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const { circumference, visible } = waypointRingMetrics();
  const offset = visible * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      aria-hidden="true"
      fill="none"
      style={
        {
          "--ring": String(circumference),
          "--arc": String(visible),
        } as CSSProperties
      }
    >
      <circle
        cx={CX}
        cy={CY}
        r={RADIUS}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${visible} ${circumference}`}
        strokeDashoffset={progress === 1 ? undefined : offset}
        transform={`rotate(-38 ${CX} ${CY})`}
      />
    </svg>
  );
}
