import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { WaypointO } from "@/components/waypoint-o";

export const LANDING_STAGE_FPS = 30;
export const LANDING_STAGE_DURATION = 240;
export const LANDING_STAGE_WIDTH = 1920;
export const LANDING_STAGE_HEIGHT = 640;

export function LandingStage() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wave = Math.sin((frame / fps) * (Math.PI / 4));
  const rise = Math.cos((frame / fps) * (Math.PI / 4));
  const progress = interpolate(wave, [-1, 1], [0.18, 1]);
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
          left: -160 + wave * 28,
          top: -120 + rise * 18,
          opacity: 0.1,
        }}
      >
        <WaypointO size={780} color="#111111" strokeWidth={3.2} progress={1} />
      </div>
      <div
        style={{
          position: "absolute",
          right: 36 - wave * 22,
          top: 28 + rise * 16,
          opacity: interpolate(wave, [-1, 1], [0.16, 0.28]),
        }}
      >
        <WaypointO size={520} color="#111111" strokeWidth={3.6} progress={progress} />
      </div>
    </AbsoluteFill>
  );
}
