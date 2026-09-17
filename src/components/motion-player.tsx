"use client";

import { useEffect, useRef, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { Player, type PlayerRef } from "@remotion/player";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function MotionPlayer({
  component,
  durationInFrames,
  compositionWidth,
  compositionHeight,
  inputProps,
  className = "",
  playWhenVisible = false,
  loop = false,
  fallback = null,
}: {
  component: ComponentType;
  durationInFrames: number;
  compositionWidth: number;
  compositionHeight: number;
  inputProps?: Record<string, unknown>;
  className?: string;
  playWhenVisible?: boolean;
  loop?: boolean;
  fallback?: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const mounted = useIsClient();
  const player = useRef<PlayerRef>(null);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mounted || reduced) return;

    let cancelled = false;
    let raf = 0;
    let running = false;
    let frame = 0;
    let lastTime = 0;
    let lastSeek = -1;
    let instance: PlayerRef | null = null;
    let observer: IntersectionObserver | null = null;

    const stop = () => {
      running = false;
      lastTime = 0;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const tick = (now: number) => {
      if (cancelled || !running || !instance) return;
      if (!lastTime) lastTime = now;
      frame += ((now - lastTime) / 1000) * 30;
      lastTime = now;
      if (loop) {
        const duration = Math.max(1, durationInFrames);
        frame %= duration;
        if (frame < 0) frame += duration;
      } else if (frame >= durationInFrames - 1) {
        instance.seekTo(durationInFrames - 1);
        stop();
        return;
      }
      const next = Math.min(durationInFrames - 1, Math.max(0, Math.floor(frame)));
      if (next !== lastSeek) {
        lastSeek = next;
        instance.seekTo(next);
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (cancelled || running || !instance) return;
      running = true;
      lastTime = 0;
      raf = requestAnimationFrame(tick);
    };

    const attach = () => {
      if (cancelled) return;
      instance = player.current;
      if (!instance) {
        raf = requestAnimationFrame(attach);
        return;
      }
      if (playWhenVisible) {
        const node = host.current;
        if (!node) return;
        observer = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) start();
            else stop();
          },
          { threshold: 0.2 },
        );
        observer.observe(node);
        return;
      }
      start();
    };

    attach();
    return () => {
      cancelled = true;
      observer?.disconnect();
      stop();
    };
  }, [durationInFrames, loop, mounted, playWhenVisible, reduced]);

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
        autoPlay={false}
        loop={false}
        controls={false}
        clickToPlay={false}
        acknowledgeRemotionLicense
        style={{ width: "100%", height: "100%", background: "transparent" }}
      />
    </div>
  );
}
