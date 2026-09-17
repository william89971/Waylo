import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { WaypointO } from "@/components/waypoint-o";

export const YELLOW_FIELD_FPS = 30;
export const YELLOW_FIELD_DURATION = 150;
export const YELLOW_FIELD_WIDTH = 640;
export const YELLOW_FIELD_HEIGHT = 640;

export function YellowField() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  const progress = interpolate(frame, [0, 1.4 * fps, 3.2 * fps, 4.2 * fps, 5 * fps], [0, 1, 1, 0, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "transparent",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          opacity: interpolate(frame, [0, 0.3 * fps, 4.3 * fps, 5 * fps], [0, 0.34, 0.34, 0.12], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          }),
          translate: interpolate(frame, [0, 1.4 * fps], ["0px 16px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          }),
        }}
      >
        <WaypointO size={460} color="#111111" strokeWidth={3.6} progress={progress} />
      </div>
    </AbsoluteFill>
  );
}
