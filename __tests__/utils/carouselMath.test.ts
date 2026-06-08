import { describe, expect, test } from "vitest";
import {
  wrapPage,
  buildInitialWindow,
  rotateForward,
  rotateBackward,
  computeTriggerPx,
  buildImageSrc,
  stampPage,
} from "@/app/_utils/carouselMath";

describe("wrapPage", () => {
  test.each([
    [1, 5, 1],
    [5, 5, 5],
    [6, 5, 1],
    [0, 5, 5],
    [-1, 5, 4],
    [3, 3, 3],
    [4, 3, 1],
  ])("wrapPage(%i, %i) → %i", (p, total, expected) => {
    expect(wrapPage(p, total)).toBe(expected);
  });
});

describe("buildInitialWindow", () => {
  const wrapMod5 = (p: number) => wrapPage(p, 5);

  test("odd window, centered", () => {
    const window = buildInitialWindow(3, 5, wrapMod5);
    expect(window).toEqual([1, 2, 3, 4, 5]);
  });

  test("even window, startPage near start", () => {
    const window = buildInitialWindow(1, 4, wrapMod5);
    expect(window).toEqual([4, 5, 1, 2]);
  });

  test("even window, startPage near end", () => {
    const window = buildInitialWindow(5, 4, wrapMod5);
    expect(window).toEqual([3, 4, 5, 1]);
  });

  test("window size larger than total pages", () => {
    const window = buildInitialWindow(2, 7, wrapMod5);
    expect(window).toEqual([4, 5, 1, 2, 3, 4, 5]);
  });
});

describe("rotateForward", () => {
  test("shifts left and appends last+1", () => {
    expect(rotateForward([1, 2, 3, 4])).toEqual([2, 3, 4, 5]);
    expect(rotateForward([10, 11, 12])).toEqual([11, 12, 13]);
  });

  test("single element array", () => {
    expect(rotateForward([42])).toEqual([43]);
  });
});

describe("rotateBackward", () => {
  test("shifts right and prepends first-1", () => {
    expect(rotateBackward([1, 2, 3, 4])).toEqual([0, 1, 2, 3]);
    expect(rotateBackward([10, 11, 12])).toEqual([9, 10, 11]);
  });

  test("single element array", () => {
    expect(rotateBackward([42])).toEqual([41]);
  });
});

describe("computeTriggerPx", () => {
  test("computes 1.5 * pageSize * itemWidth and rounds", () => {
    expect(computeTriggerPx(5, 200)).toBe(Math.round(5 * 200 * 1.5));
    expect(computeTriggerPx(3, 150)).toBe(Math.round(3 * 150 * 1.5));
    expect(computeTriggerPx(0, 100)).toBe(0);
    expect(computeTriggerPx(2, 0)).toBe(0);
  });
});

describe("buildImageSrc", () => {
  test("returns correct Picsum URL", () => {
    expect(buildImageSrc("42", 800, 600)).toBe(
      "https://picsum.photos/id/42/800/600",
    );
    expect(buildImageSrc("abc", 200, 300)).toBe(
      "https://picsum.photos/id/abc/200/300",
    );
  });
});

describe("stampPage", () => {
  test("adds unique id to each image based on slotIndex", () => {
    const input = [
      { src: "a.jpg", alt: "A" },
      { src: "b.jpg", alt: "B" },
    ];
    const result = stampPage(input, 3);
    expect(result).toEqual([
      { src: "a.jpg", alt: "A", id: "slot3-0" },
      { src: "b.jpg", alt: "B", id: "slot3-1" },
    ]);
  });

  test("handles empty array", () => {
    expect(stampPage([], 5)).toEqual([]);
  });

  test("preserves all original fields", () => {
    const complex = [{ foo: "bar", nested: { x: 1 } }];
    const result = stampPage(complex as any, 0);
    expect(result[0]).toMatchObject({
      foo: "bar",
      nested: { x: 1 },
      id: "slot0-0",
    });
  });
});
