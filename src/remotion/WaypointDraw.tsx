import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { WaypointO } from "@/components/waypoint-o";

export const WAYPOINT_DRAW_FPS = 30;
export const WAYPOINT_DRAW_DURATION = 48;
export const WAYPOINT_DRAW_SIZE = 64;

export function WaypointDraw({ color = "#111111" }: { color?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          opacity: interpolate(frame, [0, 0.2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <WaypointO
          size={52}
          color={color}
          strokeWidth={3.4}
          progress={interpolate(frame, [0, 1.2 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          })}
        />
      </div>
    </AbsoluteFill>
  );
}
