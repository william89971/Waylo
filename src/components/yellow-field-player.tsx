"use client";

import { MotionPlayer } from "@/components/motion-player";
import {
  YELLOW_FIELD_DURATION,
  YELLOW_FIELD_HEIGHT,
  YELLOW_FIELD_WIDTH,
  YellowField,
} from "@/remotion/YellowField";

export function YellowFieldPlayer({ className = "" }: { className?: string }) {
  return (
    <MotionPlayer
      className={`yellow-field-motion ${className}`.trim()}
      component={YellowField}
      durationInFrames={YELLOW_FIELD_DURATION}
      compositionWidth={YELLOW_FIELD_WIDTH}
      compositionHeight={YELLOW_FIELD_HEIGHT}
      playWhenVisible
    />
  );
}
