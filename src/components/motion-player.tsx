"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Player, type PlayerRef } from "@remotion/player";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function MotionPlayer({
  component,
  durationInFrames,
  compositionWidth,
  compositionHeight,
  inputProps,
  className = "",
  playWhenVisible = false,
  fallback = null,
}: {
  component: ComponentType;
  durationInFrames: number;
  compositionWidth: number;
  compositionHeight: number;
  inputProps?: Record<string, unknown>;
  className?: string;
  playWhenVisible?: boolean;
  fallback?: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const player = useRef<PlayerRef>(null);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || reduced) return;
    const instance = player.current;
    if (!instance) return;

    if (playWhenVisible) {
      const node = host.current;
      if (!node) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) instance.play();
        },
        { threshold: 0.4 },
      );
      observer.observe(node);
      return () => observer.disconnect();
    }

    instance.play();
    const timer = window.setTimeout(() => {
      if (instance.getCurrentFrame() < 2) instance.seekTo(Math.max(0, durationInFrames - 1));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [durationInFrames, mounted, playWhenVisible, reduced]);

  if (reduced || !mounted) return <>{fallback}</>;

  return (
    <div ref={host} className={className} aria-hidden="true">
      <Player
        ref={player}
        component={component}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        compositionWidth={compositionWidth}
        compositionHeight={compositionHeight}
        fps={30}
        autoPlay={!playWhenVisible}
        loop={false}
        controls={false}
        clickToPlay={false}
        acknowledgeRemotionLicense
        style={{ width: "100%", height: "100%", background: "transparent" }}
      />
    </div>
  );
}
