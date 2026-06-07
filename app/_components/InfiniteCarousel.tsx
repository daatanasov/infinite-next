"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCircularCarousel } from "../_hooks/useCircularCarousel";
import { useAutoPlay } from "../_hooks/useAutoPlay";
import { useDragScroll } from "../_hooks/useDragScroll";
import CarouselCard from "./CarouselCard";
import { Skeleton } from "./Skeleton";
import { ErrorBanner } from "./ErrorBanner";

export interface InfiniteCarouselProps {
  totalItems?: number;
  pageSize?: number;
  height?: number;
  gap?: number;
  speed?: number;
  direction?: "right" | "left";
  width?: number;
}

export default function InfiniteCarousel({
  totalItems = 100,
  pageSize = 20,
  height = 240,
  width = 150,
  gap = 14,
  speed = 2,
  direction = "right",
}: InfiniteCarouselProps) {
  const itemSize = width + gap;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    items,
    windowItems,
    onScroll,
    initialScrollLeft,
    isLoadingBackward,
    isLoadingForward,
    error,
    clearError,
  } = useCircularCarousel(itemSize, containerRef, { totalItems, pageSize });

  const virtualizer = useVirtualizer({
    count: windowItems,
    horizontal: true,
    getScrollElement: () => containerRef.current,
    estimateSize: () => itemSize,
    overscan: 5,
    getItemKey: (i) => i,
  });
  const lastScrollTimestampRef = useRef<number>(0);
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = initialScrollLeft;
    }
  }, [initialScrollLeft]);

  const isHovering = useRef(false);

  const { isDragging, ...dragHandlers } = useDragScroll({
    containerRef,
    onScrollChange: onScroll,
  });

  useAutoPlay({
    containerRef,
    speed,
    direction,
    pauseRefs: [isHovering, isDragging],
    lastScrollTimestampRef,
  });

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) onScroll(el.scrollLeft);
  }, [onScroll]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollLeft += e.deltaY + e.deltaX;
      onScroll(el.scrollLeft);
    },
    [onScroll],
  );

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="carousel-wrapper">
      {isLoadingBackward && (
        <div className="edge-indicator edge-indicator-left" aria-hidden="true">
          ‹
        </div>
      )}
      {isLoadingForward && (
        <div className="edge-indicator edge-indicator-right" aria-hidden="true">
          ›
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      <div
        ref={containerRef}
        className="scroll-container"
        style={{ height }}
        role="region"
        aria-label="Image carousel"
        tabIndex={0}
        onScroll={handleScroll}
        onMouseEnter={() => {
          isHovering.current = true;
        }}
        onMouseLeave={() => {
          isHovering.current = false;
          isDragging.current = false;
        }}
        onWheel={handleWheel}
        {...dragHandlers}>
        <div
          className="track"
          style={{ width: virtualizer.getTotalSize() }}
          aria-hidden="true">
          {virtualItems.map((vItem) => (
            <div
              key={vItem.key}
              className="virtual-item"
              style={{
                left: vItem.start,
                width: vItem.size,
                paddingRight: gap,
              }}>
              {items[vItem.index] != null ? (
                <CarouselCard
                  image={items[vItem.index]!}
                  cardWidth={width}
                  height={height}
                />
              ) : (
                <Skeleton />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
