import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { WaypointO } from "@/components/waypoint-o";

export const YELLOW_FIELD_FPS = 30;
export const YELLOW_FIELD_DURATION = 150;
export const YELLOW_FIELD_WIDTH = 1920;
export const YELLOW_FIELD_HEIGHT = 540;

export function YellowField() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  const progress = interpolate(frame, [0, 1.5 * fps, 2.9 * fps, 4.1 * fps, 5 * fps], [0, 1, 1, 0, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 36,
          top: 18,
          opacity: interpolate(frame, [0, 0.35 * fps, 4.2 * fps, 5 * fps], [0, 0.22, 0.22, 0.08], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          }),
          translate: interpolate(frame, [0, 1.5 * fps], ["0px 22px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          }),
        }}
      >
        <WaypointO size={380} color="#111111" strokeWidth={14} progress={progress} />
      </div>
    </AbsoluteFill>
  );
}
