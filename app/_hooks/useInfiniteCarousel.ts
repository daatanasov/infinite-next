// useInfiniteCarousel.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { PAGE_SIZE, PICSUM_BASE_URL } from "../_utils/const";
import { stampPage } from "../_utils/carouselMath";

export interface Image {
  id: string;
  url: string;
  width: number;
  height: number;
  download_url: string;
}

export interface UseInfiniteCarouselOptions {
  /** Total number of items across all pages (e.g. 1000 → 50 pages). */
  totalItems: number;
  /** Width of one card in px (used to compute prependOffset). */
  itemWidth: number;
  /**
   * How many items from the visible edge trigger a prefetch.
   * Default: 5.
   */
  prefetchThreshold?: number;
}

export interface UseInfiniteCarouselResult {
  items: Image[];
  isLoadingForward: boolean;
  isLoadingBackward: boolean;
  prependOffset: number;
  clearPrependOffset: () => void;
  onScrollProgress: (firstVisible: number, lastVisible: number) => void;
}

/** Wraps a 1-based page number into [1, totalPages] circularly. */
function wrapPage(page: number, totalPages: number): number {
  return ((page - 1 + totalPages) % totalPages) + 1;
}

export function useInfiniteCarousel({
  totalItems,
  itemWidth,
  prefetchThreshold = 5,
}: UseInfiniteCarouselOptions): UseInfiniteCarouselResult {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // ─── page-data cache: real page number → raw Image data ──────────────────
  // We cache the *data* keyed by real page number so we never re-fetch.
  // But when we stitch items into the list we stamp each item with a unique
  // slot index so React keys never collide even when the same page appears
  // multiple times (wrap-around).
  const pageCache = useRef<Map<number, Array<Omit<Image, "id">>>>(new Map());

  // ─── sequence tracking ────────────────────────────────────────────────────
  // `loadedSlots` is the source of truth for what's in `items`.
  // Each entry = { slotIndex, realPage } — slotIndex is globally unique,
  // realPage tells us which API page to fetch/read from cache.
  const loadedSlots = useRef<Array<{ slotIndex: number; realPage: number }>>(
    [],
  );
  // Monotonically increasing — never reset, never reused.
  const nextSlotIndex = useRef(0);

  // Mutex refs — prevent concurrent forward/backward fetches
  const isFetchingForward = useRef(false);
  const isFetchingBackward = useRef(false);

  // ─── state ────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Image[]>([]);
  const [isLoadingForward, setIsLoadingForward] = useState(false);
  const [isLoadingBackward, setIsLoadingBackward] = useState(false);
  const [prependOffset, setPrependOffset] = useState(0);

  const clearPrependOffset = useCallback(() => setPrependOffset(0), []);

  // ─── fetchPageData ────────────────────────────────────────────────────────
  // Returns raw image data (no id) for a real page number.
  const fetchPageData = useCallback(
    async (realPage: number): Promise<Array<Omit<Image, "id">>> => {
      if (pageCache.current.has(realPage)) {
        return pageCache.current.get(realPage)!;
      }
      const res = await fetch(
        `${PICSUM_BASE_URL}?page=${realPage}&limit=${PAGE_SIZE}`,
      );
      if (!res.ok)
        throw new Error(`Fetch failed: page ${realPage} → ${res.status}`);
      const data: Array<{
        id: string;
        download_url: string;
        width: number;
        height: number;
      }> = await res.json();
      const images = data.map((img) => ({
        url: img.download_url,
        download_url: img.download_url,
        width: img.width,
        height: img.height,
      }));
      pageCache.current.set(realPage, images);
      return images;
    },
    [],
  );

  // ─── stampPage ────────────────────────────────────────────────────────────
  // Takes raw image data and a slot index, returns Image[] with unique IDs.

  // ─── initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const middlePage = Math.ceil(totalPages / 2);
      const realPages = [
        wrapPage(middlePage - 1, totalPages),
        wrapPage(middlePage, totalPages),
        wrapPage(middlePage + 1, totalPages),
      ];

      setIsLoadingForward(true);
      try {
        const results = await Promise.all(realPages.map(fetchPageData));
        if (cancelled) return;

        const slots = realPages.map((realPage) => ({
          slotIndex: nextSlotIndex.current++,
          realPage,
        }));
        loadedSlots.current = slots;

        const allItems = slots.flatMap((slot, i) =>
          stampPage(results[i], slot.slotIndex),
        );
        setItems(allItems);
      } catch (err) {
        if (!cancelled) console.error("[useInfiniteCarousel] init failed", err);
      } finally {
        if (!cancelled) setIsLoadingForward(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [totalPages, fetchPageData]);

  // ─── appendPage ───────────────────────────────────────────────────────────
  const appendPage = useCallback(async () => {
    if (isFetchingForward.current) return;
    const slots = loadedSlots.current;
    if (slots.length === 0) return;

    const lastRealPage = slots[slots.length - 1].realPage;
    const nextRealPage = wrapPage(lastRealPage + 1, totalPages);

    isFetchingForward.current = true;
    setIsLoadingForward(true);
    try {
      const data = await fetchPageData(nextRealPage);
      // Re-read slots in case a prepend landed during our await
      const currentSlots = loadedSlots.current;
      const newSlot = {
        slotIndex: nextSlotIndex.current++,
        realPage: nextRealPage,
      };
      loadedSlots.current = [...currentSlots, newSlot];
      const newImages = stampPage(data, newSlot.slotIndex);
      setItems((prev) => [...prev, ...newImages]);
    } catch (err) {
      console.error("[useInfiniteCarousel] appendPage failed", err);
    } finally {
      isFetchingForward.current = false;
      setIsLoadingForward(false);
    }
  }, [fetchPageData, totalPages]);

  // ─── prependPage ──────────────────────────────────────────────────────────
  const prependPage = useCallback(async () => {
    if (isFetchingBackward.current) return;
    const slots = loadedSlots.current;
    if (slots.length === 0) return;

    const firstRealPage = slots[0].realPage;
    const prevRealPage = wrapPage(firstRealPage - 1, totalPages);

    isFetchingBackward.current = true;
    setIsLoadingBackward(true);
    try {
      const data = await fetchPageData(prevRealPage);
      const currentSlots = loadedSlots.current;
      const newSlot = {
        slotIndex: nextSlotIndex.current++,
        realPage: prevRealPage,
      };
      loadedSlots.current = [newSlot, ...currentSlots];
      const newImages = stampPage(data, newSlot.slotIndex);
      setItems((prev) => [...newImages, ...prev]);
      setPrependOffset(newImages.length * itemWidth);
    } catch (err) {
      console.error("[useInfiniteCarousel] prependPage failed", err);
    } finally {
      isFetchingBackward.current = false;
      setIsLoadingBackward(false);
    }
  }, [fetchPageData, itemWidth, totalPages]);

  // ─── onScrollProgress ─────────────────────────────────────────────────────
  const onScrollProgress = useCallback(
    (firstVisible: number, lastVisible: number) => {
      const totalLoaded = loadedSlots.current.length * PAGE_SIZE;
      if (totalLoaded === 0) return;

      if (lastVisible >= totalLoaded - prefetchThreshold) {
        appendPage();
      }
      if (firstVisible <= prefetchThreshold) {
        prependPage();
      }
    },
    [appendPage, prependPage, prefetchThreshold],
  );

  return {
    items,
    isLoadingForward,
    isLoadingBackward,
    prependOffset,
    clearPrependOffset,
    onScrollProgress,
  };
}
