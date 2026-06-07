"use client";

import { useEffect, useRef } from "react";
import { INERTIA_QUIET_MS } from "../_utils/const";

interface AutoScrollOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  speed: number;
  direction: "left" | "right";
  pauseRefs: React.RefObject<boolean>[];
  lastScrollTimestampRef: React.RefObject<number>;
}

export function useAutoPlay({
  containerRef,
  speed,
  direction,
  pauseRefs,
  lastScrollTimestampRef,
}: AutoScrollOptions): void {
  const speedRef = useRef(speed);
  const directionRef = useRef(direction);
  const pauseRefsRef = useRef(pauseRefs);
  const lastTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);
  useEffect(() => {
    pauseRefsRef.current = pauseRefs;
  });

  useEffect(() => {
    let rafId: number;

    const tick = (timestamp: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const delta = Math.min(timestamp - lastTimeRef.current, 64);
      lastTimeRef.current = timestamp;

      const el = containerRef.current;
      const isPaused = pauseRefsRef.current.some((r) => r.current);
      const msSinceLastScroll = Date.now() - lastScrollTimestampRef.current;
      const isCoasting = msSinceLastScroll < INERTIA_QUIET_MS;

      if (el && !isPaused && !isCoasting) {
        const frameSpeed = speedRef.current * (delta / 16.667);
        accumulatorRef.current += frameSpeed;

        const pixels = Math.floor(accumulatorRef.current);
        if (pixels !== 0) {
          el.scrollLeft += directionRef.current === "right" ? pixels : -pixels;
          accumulatorRef.current -= pixels;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      lastTimeRef.current = null;
    };
  }, [containerRef, lastScrollTimestampRef]);
}
