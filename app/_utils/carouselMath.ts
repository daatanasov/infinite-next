import type { Image } from "../_hooks/useInfiniteCarousel";

export function wrapPage(p: number, totalPages: number): number {
  return ((p - 1 + totalPages) % totalPages) + 1;
}

export function buildInitialWindow(
  startPage: number,
  windowPages: number,
  wrap: (p: number) => number,
): number[] {
  const half = Math.floor(windowPages / 2);
  return Array.from({ length: windowPages }, (_, i) =>
    wrap(startPage - half + i),
  );
}

export function rotateForward(pages: readonly number[]): number[] {
  return [...pages.slice(1), pages[pages.length - 1] + 1];
}

/** Slide the window one step backward (immutable). */
export function rotateBackward(pages: readonly number[]): number[] {
  return [pages[0] - 1, ...pages.slice(0, -1)];
}

export function computeTriggerPx(pageSize: number, itemWidth: number): number {
  return Math.round(pageSize * itemWidth * 1.5);
}

/** Construct the Picsum URL for a given size. */
export function buildImageSrc(id: string, w: number, h: number): string {
  return `https://picsum.photos/id/${id}/${w}/${h}`;
}

export const stampPage = (
  data: Array<Omit<Image, "id">>,
  slotIndex: number,
): Image[] => data.map((img, i) => ({ ...img, id: `slot${slotIndex}-${i}` }));
