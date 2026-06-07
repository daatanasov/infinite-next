"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import StaticCard from "./StaticCard";

const LOOPS = 3;

interface ImageItem {
  id: string;
  download_url: string;
  width: number;
  height: number;
}

interface SmoothCarouselProps {
  images: ImageItem[];
  height?: number;
  speed?: number;
  direction?: "right" | "left";
  width?: number;
  gap?: number;
}

export default function SmoothCarousel({
  images,
  height = 220,
  speed = 1,
  direction = "right",
  width = 100,
  gap = 12,
}: SmoothCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const trackRef = useRef<HTMLDivElement>(null);

  const offsetRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number>(0);

  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragOffsetAtStartRef = useRef(0);

  const loopWidth = (width + gap) * images.length;

  const repeatedImages = Array.from(
    { length: images.length * LOOPS },
    (_, i) => images[i % images.length],
  );

  const wrapOffset = useCallback(() => {
    if (offsetRef.current >= loopWidth * 2) {
      offsetRef.current -= loopWidth;
    } else if (offsetRef.current < loopWidth) {
      offsetRef.current += loopWidth;
    }
  }, [loopWidth]);

  const applyTransform = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${-offsetRef.current}px)`;
    }
  }, []);

  useLayoutEffect(() => {
    offsetRef.current = loopWidth;
    applyTransform();
  }, [loopWidth, applyTransform]);

  useEffect(() => {
    const step = (timestamp: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const delta = Math.min(timestamp - lastTimeRef.current, 64);
      lastTimeRef.current = timestamp;

      if (!isPausedRef.current && !isDraggingRef.current) {
        const frameSpeed = speed * (delta / 16.667);
        offsetRef.current += direction === "right" ? frameSpeed : -frameSpeed;
        wrapOffset();
        applyTransform();
      }

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
    };
  }, [direction, speed, wrapOffset, applyTransform]);

  const handleMouseEnter = () => {
    isPausedRef.current = true;
  };

  const handleMouseLeave = () => {
    isPausedRef.current = false;
    isDraggingRef.current = false;
    lastTimeRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragOffsetAtStartRef.current = offsetRef.current;
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const delta = e.clientX - dragStartXRef.current;
    offsetRef.current = dragOffsetAtStartRef.current - delta;
    wrapOffset();
    applyTransform();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    lastTimeRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.touches[0].clientX;
    dragOffsetAtStartRef.current = offsetRef.current;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const delta = e.touches[0].clientX - dragStartXRef.current;
    offsetRef.current = dragOffsetAtStartRef.current - delta;
    wrapOffset();
    applyTransform();
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    lastTimeRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    offsetRef.current += e.deltaX + e.deltaY;
    wrapOffset();
    applyTransform();
  };

  const totalTrackWidth = (width + gap) * repeatedImages.length;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="scroll-container"
      style={{
        height,
        overflow: "hidden",
        cursor: "grab",
        position: "relative",
      }}>
      <div
        ref={trackRef}
        className="track"
        style={{
          display: "flex",
          flexDirection: "row",
          gap: `${gap}px`,
          width: totalTrackWidth,
          height: "100%",
          willChange: "transform",
          transform: "translateX(0)",
        }}>
        {repeatedImages.map((image, index) => (
          <div
            key={`${image.id}-${index}`}
            style={{
              width,
              flexShrink: 0,
              height: "100%",
            }}>
            <StaticCard image={image} />
          </div>
        ))}
      </div>
    </div>
  );
}
