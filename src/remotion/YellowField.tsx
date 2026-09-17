import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { WaypointO } from "@/components/waypoint-o";

export const YELLOW_FIELD_FPS = 30;
export const YELLOW_FIELD_DURATION = 90;
export const YELLOW_FIELD_WIDTH = 1920;
export const YELLOW_FIELD_HEIGHT = 540;

export function YellowField() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#d8ff4f",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -80,
          top: 10,
          opacity: interpolate(frame, [0, 0.4 * fps], [0, 0.18], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [0, 2.4 * fps], ["0px 28px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <WaypointO
          size={520}
          color="#111111"
          strokeWidth={16}
          progress={interpolate(frame, [0, 1.8 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          })}
        />
      </div>
    </AbsoluteFill>
  );
}
