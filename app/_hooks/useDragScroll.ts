"use client";

import { useCallback, useRef } from "react";

interface DragScrollOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScrollChange?: (scrollLeft: number) => void;
}

interface DragScrollHandlers {
  isDragging: React.RefObject<boolean>;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function useDragScroll({
  containerRef,
  onScrollChange,
}: DragScrollOptions): DragScrollHandlers {
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStart = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      scrollStart.current = containerRef.current?.scrollLeft ?? 0;
      e.preventDefault();
    },
    [containerRef],
  );

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, [containerRef]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      containerRef.current.scrollLeft =
        scrollStart.current - (e.clientX - dragStartX.current);
    },
    [containerRef],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDragging.current = true;
      dragStartX.current = e.touches[0].clientX;
      scrollStart.current = containerRef.current?.scrollLeft ?? 0;
    },
    [containerRef],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!isDragging.current || !containerRef.current) return;
      containerRef.current.scrollLeft =
        scrollStart.current - (e.touches[0].clientX - dragStartX.current);
    },
    [containerRef, onScrollChange],
  );

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  return {
    isDragging,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
