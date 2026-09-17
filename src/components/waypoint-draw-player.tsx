"use client";

import { MotionPlayer } from "@/components/motion-player";
import { WaypointO } from "@/components/waypoint-o";
import {
  WAYPOINT_DRAW_DURATION,
  WAYPOINT_DRAW_SIZE,
  WaypointDraw,
} from "@/remotion/WaypointDraw";

export function WaypointDrawPlayer({
  className = "",
  playWhenVisible = false,
}: {
  className?: string;
  playWhenVisible?: boolean;
}) {
  return (
    <MotionPlayer
      className={`waypoint-draw ${className}`.trim()}
      component={WaypointDraw}
      durationInFrames={WAYPOINT_DRAW_DURATION}
      compositionWidth={WAYPOINT_DRAW_SIZE}
      compositionHeight={WAYPOINT_DRAW_SIZE}
      playWhenVisible={playWhenVisible}
      fallback={<WaypointO className="waypoint-draw-fallback" />}
    />
  );
}
