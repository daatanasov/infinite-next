"use client";
import { useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useInfiniteCarousel } from "../_hooks/useInfiniteCarousel";
import { InfiniteCarouselProps } from "./InfiniteCarousel";
import StaticCard from "./StaticCard";
import { Skeleton } from "./Skeleton";

export default function FetchCarousel({
  totalItems = 100,
  height = 240,
  width = 150,
  gap = 14,
  speed = 0.7,
  pageSize = 20,
}: InfiniteCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);
  const hasCenteredRef = useRef(false);

  const {
    items,
    isLoadingForward,
    isLoadingBackward,
    prependOffset,
    clearPrependOffset,
    onScrollProgress,
  } = useInfiniteCarousel({
    totalItems,
    itemWidth: width,
    prefetchThreshold: 5,
  });

  const virtualizer = useVirtualizer({
    count: items.length,
    horizontal: true,
    getScrollElement: () => containerRef.current,
    estimateSize: () => width,
    gap,
    overscan: 5,
    getItemKey: (i) => items[i]?.id ?? i,
  });

  useEffect(() => {
    if (hasCenteredRef.current) return;
    if (items.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    const middleItemIndex = pageSize + 9; // 0-based
    const itemLeft = middleItemIndex * (width + gap);
    const centeredScrollLeft = itemLeft - (el.clientWidth - width) / 2;

    el.scrollLeft = Math.max(0, centeredScrollLeft);
    hasCenteredRef.current = true;
  }, [items.length, containerRef, width, gap, pageSize]);

  useEffect(() => {
    if (prependOffset <= 0) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft += prependOffset;
    clearPrependOffset();
  }, [prependOffset, clearPrependOffset]);
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const virtualItems = virtualizer.getVirtualItems();
    if (!virtualItems.length) return;
    const first = virtualItems[0].index;
    const last = virtualItems[virtualItems.length - 1].index;
    onScrollProgress(first, last);
  }, [virtualizer, onScrollProgress]);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    let rafId: number;

    const step = () => {
      const el = containerRef.current;
      if (el && !hoverRef.current && !isDraggingRef.current) {
        el.scrollLeft += speed;
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [containerRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartX.current = e.clientX;
    scrollStartX.current = containerRef.current!.scrollLeft;
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    containerRef.current.scrollLeft =
      scrollStartX.current - (e.clientX - dragStartX.current);
  }, []);

  const stopDrag = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDraggingRef.current = true;
    dragStartX.current = e.touches[0].clientX;
    scrollStartX.current = containerRef.current!.scrollLeft;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    containerRef.current.scrollLeft =
      scrollStartX.current - (e.touches[0].clientX - dragStartX.current);
  }, []);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      className="carousel-wrapper"
      data-testid="fetch-carousel-wrapper"
      style={{ position: "relative" }}>
      {isLoadingBackward && (
        <span
          data-testid="fetch-carouse-loading-backward-indicator"
          className="edge-indicator edge-indicator-left">
          ←
        </span>
      )}
      {isLoadingForward && (
        <span
          data-testid="fetch-carouse-loading-forward-indicator"
          className="edge-indicator edge-indicator-right">
          →
        </span>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseEnter={() => {
          hoverRef.current = true;
        }}
        onMouseLeave={() => {
          hoverRef.current = false;
          isDraggingRef.current = false;
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDrag}
        data-testid="fetch-carousel-container"
        className="scroll-container"
        style={{
          height,
        }}>
        <div
          data-testid="fetch-carousel-track"
          style={{
            width: virtualizer.getTotalSize(),
            height: "100%",
            position: "relative",
          }}>
          {virtualItems.map((vItem) => (
            <div
              key={vItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: vItem.start,
                width: vItem.size,
                height: "100%",
                boxSizing: "border-box",
              }}>
              {items[vItem.index] ? (
                <StaticCard image={items[vItem.index]} />
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
