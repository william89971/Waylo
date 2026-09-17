"use client";

import { MotionPlayer } from "@/components/motion-player";
import {
  LANDING_STAGE_DURATION,
  LANDING_STAGE_HEIGHT,
  LANDING_STAGE_WIDTH,
  LandingStage,
} from "@/remotion/LandingStage";

export function LandingStagePlayer({ className = "" }: { className?: string }) {
  return (
    <MotionPlayer
      className={`waylo-stage-motion ${className}`.trim()}
      component={LandingStage}
      durationInFrames={LANDING_STAGE_DURATION}
      compositionWidth={LANDING_STAGE_WIDTH}
      compositionHeight={LANDING_STAGE_HEIGHT}
      playWhenVisible={false}
      loop
    />
  );
}
