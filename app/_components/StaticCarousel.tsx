"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import StaticCard from "./StaticCard";

const LOOPS = 5;

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
  const hoverRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  const ORIGINAL_ITEMS = images.length;
  const TOTAL_VIRTUAL_ITEMS = ORIGINAL_ITEMS * LOOPS;

  const getLoopWidth = useCallback(() => {
    return (width + gap) * ORIGINAL_ITEMS;
  }, [width, gap, ORIGINAL_ITEMS]);

  const virtualizer = useVirtualizer({
    count: TOTAL_VIRTUAL_ITEMS,
    horizontal: true,
    getScrollElement: () => containerRef.current,
    estimateSize: () => width,
    gap,
    overscan: ORIGINAL_ITEMS,
    initialOffset: getLoopWidth() * 2,
    getItemKey: (index) =>
      `${images[index % ORIGINAL_ITEMS].id}-${Math.floor(index / ORIGINAL_ITEMS)}`,
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft = getLoopWidth() * 2;
  }, [getLoopWidth]);

  const wrapScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const loopWidth = getLoopWidth();

    if (el.scrollLeft >= loopWidth * 3) {
      el.scrollLeft -= loopWidth;
    } else if (el.scrollLeft < loopWidth * 2) {
      el.scrollLeft += loopWidth;
    }
  }, [getLoopWidth]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number;
    const step = () => {
      if (!hoverRef.current && !isDraggingRef.current) {
        el.scrollLeft += direction === "right" ? speed : -speed;
        wrapScroll();
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [direction, speed, wrapScroll]);

  const handleMouseEnter = () => {
    hoverRef.current = true;
  };
  const handleMouseLeave = () => {
    hoverRef.current = false;
    isDraggingRef.current = false;
    if (containerRef.current) containerRef.current.style.cursor = "grab";
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartX.current = e.clientX;
    scrollStartX.current = containerRef.current!.scrollLeft;
    if (containerRef.current) containerRef.current.style.cursor = "grabbing";
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.preventDefault();
    containerRef.current.scrollLeft =
      scrollStartX.current - (e.clientX - dragStartX.current);
    wrapScroll();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (containerRef.current) containerRef.current.style.cursor = "grab";
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    dragStartX.current = e.touches[0].clientX;
    scrollStartX.current = containerRef.current!.scrollLeft;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    containerRef.current.scrollLeft =
      scrollStartX.current - (e.touches[0].clientX - dragStartX.current);
    wrapScroll();
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft += e.deltaY + e.deltaX;
  };

  const virtualItems = virtualizer.getVirtualItems();

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
      }}>
      <div
        className="track"
        style={{
          width: virtualizer.getTotalSize(),
        }}>
        {virtualItems.map((vItem) => {
          const image = images[vItem.index % ORIGINAL_ITEMS];
          return (
            <div
              key={vItem.key}
              className="virtual-item"
              style={{
                left: vItem.start,
                width: width,
              }}>
              <StaticCard image={image} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
