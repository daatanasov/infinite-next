"use client";

import { useEffect, useRef } from "react";

const INERTIA_QUIET_MS = 80;

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

    const tick = () => {
      const el = containerRef.current;
      const isPaused = pauseRefsRef.current.some((r) => r.current);
      const msSinceLastScroll = Date.now() - lastScrollTimestampRef.current;
      const isCoasting = msSinceLastScroll < INERTIA_QUIET_MS;

      if (el && !isPaused && !isCoasting) {
        if (directionRef.current === "right") {
          el.scrollLeft += speedRef.current;
        } else {
          el.scrollLeft -= speedRef.current;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [containerRef, lastScrollTimestampRef]);
}
