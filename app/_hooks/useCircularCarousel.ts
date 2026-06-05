"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  buildInitialWindow,
  computeTriggerPx,
  rotateBackward,
  rotateForward,
  wrapPage,
} from "../_utils/carouselMath";
import { BUFFER_PAGES, SETTLE_FRAMES } from "../_utils/const";
import { fetchPicsumPage, type PicsumImage } from "../_utils/api";
import { reducer } from "../_utils/reducer";

export type { PicsumImage };

export interface CarouselConfig {
  totalItems: number;
  pageSize: number;
}

export interface CarouselState {
  items: (PicsumImage | undefined)[];
  windowItems: number;
  onScroll: (scrollLeft: number) => void;
  initialScrollLeft: number;
  isLoadingForward: boolean;
  isLoadingBackward: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCircularCarousel(
  itemWidth: number,
  containerRef: React.RefObject<HTMLDivElement | null>,
  { totalItems, pageSize }: CarouselConfig,
): CarouselState {
  const totalPages = Math.ceil(totalItems / pageSize);
  const windowPages = Math.min(BUFFER_PAGES, totalPages);
  const windowItems = windowPages * pageSize;
  const totalWidth = windowItems * itemWidth;
  const centerScroll = Math.floor(totalWidth / 2);
  const triggerPx = computeTriggerPx(pageSize, itemWidth);

  const wrap = useCallback(
    (p: number) => wrapPage(p, totalPages),
    [totalPages],
  );

  const [{ items, isLoadingForward, isLoadingBackward, error }, dispatch] =
    useReducer(reducer, {
      items: new Array(windowItems),
      isLoadingForward: false,
      isLoadingBackward: false,
      error: null,
    });

  const cache = useRef<Map<number, PicsumImage[]>>(new Map());
  const bufferPages = useRef<number[]>([]);
  const isRotating = useRef(false);

  const loadPage = useCallback(
    async (
      page: number,
      signal: AbortSignal,
    ): Promise<PicsumImage[] | undefined> => {
      const key = wrap(page);
      const cached = cache.current.get(key);
      if (cached) return cached;

      const result = await fetchPicsumPage(key, pageSize, signal);
      if (!result.ok) {
        if (result.reason === "aborted") return undefined;
        if (result.reason === "http") {
          throw new Error(`HTTP ${result.status} fetching page ${key}`);
        }
        throw result.error;
      }

      cache.current.set(key, result.data);
      return result.data;
    },
    [wrap, pageSize],
  );

  const buildItems = useCallback(
    (pages: number[]): (PicsumImage | undefined)[] => {
      const next = new Array<PicsumImage | undefined>(windowItems);
      pages.forEach((p, pageIdx) => {
        const page = cache.current.get(wrap(p)) ?? [];
        page.forEach((img, imgIdx) => {
          next[pageIdx * pageSize + imgIdx] = img;
        });
      });
      return next;
    },
    [wrap, windowItems, pageSize],
  );

  const waitForSettle = useCallback((): Promise<void> => {
    const el = containerRef.current;
    if (el) el.scrollLeft = centerScroll;

    return new Promise<void>((resolve) => {
      let frames = 0;
      const tick = () => {
        if (++frames >= SETTLE_FRAMES) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, [containerRef, centerScroll]);

  // ── Initial load ─────────────────────────────────────────────────────────────
  // No setState calls here — all state transitions go through dispatch,
  // so there is no "state synced to a prop inside an effect" pattern.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const startPage = Math.floor(totalPages / 2);
    const pages = buildInitialWindow(startPage, windowPages, wrap);

    dispatch({ type: "LOAD_START", direction: "forward" });

    Promise.all(pages.map((p) => loadPage(p, signal)))
      .then((results) => {
        if (signal.aborted || results.some((r) => r === undefined)) return;

        bufferPages.current = pages;
        const el = containerRef.current;
        if (el) el.scrollLeft = centerScroll;

        dispatch({ type: "LOAD_SUCCESS", items: buildItems(pages) });
      })
      .catch((err) => {
        if (signal.aborted) return;
        console.error("[Carousel] Initial load failed:", err);
        dispatch({
          type: "LOAD_ERROR",
          message: "Failed to load images. Please refresh.",
        });
      });

    return () => controller.abort();
  }, [
    containerRef,
    centerScroll,
    loadPage,
    wrap,
    windowPages,
    totalPages,
    buildItems,
  ]);

  // ── Rotate helpers ────────────────────────────────────────────────────────────

  const rotateForwardAsync = useCallback(async () => {
    if (isRotating.current) return;
    isRotating.current = true;
    dispatch({ type: "LOAD_START", direction: "forward" });

    const controller = new AbortController();

    try {
      const pages = bufferPages.current;
      const nextPage = pages[pages.length - 1] + 1;
      const result = await loadPage(nextPage, controller.signal);
      if (result === undefined) return;

      const newPages = rotateForward(pages);
      bufferPages.current = newPages;

      await waitForSettle();
      dispatch({ type: "LOAD_SUCCESS", items: buildItems(newPages) });
    } catch (err) {
      console.error("[Carousel] rotateForward failed:", err);
      dispatch({ type: "LOAD_ERROR", message: "Failed to load next images." });
    } finally {
      isRotating.current = false;
    }
  }, [loadPage, waitForSettle, buildItems]);

  const rotateBackwardAsync = useCallback(async () => {
    if (isRotating.current) return;
    isRotating.current = true;
    dispatch({ type: "LOAD_START", direction: "backward" });

    const controller = new AbortController();

    try {
      const pages = bufferPages.current;
      const prevPage = pages[0] - 1;
      const result = await loadPage(prevPage, controller.signal);
      if (result === undefined) return;

      const newPages = rotateBackward(pages);
      bufferPages.current = newPages;

      await waitForSettle();
      dispatch({ type: "LOAD_SUCCESS", items: buildItems(newPages) });
    } catch (err) {
      console.error("[Carousel] rotateBackward failed:", err);
      dispatch({
        type: "LOAD_ERROR",
        message: "Failed to load previous images.",
      });
    } finally {
      isRotating.current = false;
    }
  }, [loadPage, waitForSettle, buildItems]);

  // ── Scroll handler ────────────────────────────────────────────────────────────

  const onScroll = useCallback(
    (scrollLeft: number) => {
      if (isRotating.current) return;
      if (scrollLeft >= totalWidth - triggerPx) {
        void rotateForwardAsync();
      } else if (scrollLeft <= triggerPx) {
        void rotateBackwardAsync();
      }
    },
    [totalWidth, triggerPx, rotateForwardAsync, rotateBackwardAsync],
  );

  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), []);

  return {
    items,
    windowItems,
    onScroll,
    initialScrollLeft: centerScroll,
    isLoadingForward,
    isLoadingBackward,
    error,
    clearError,
  };
}
