import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useInfiniteCarousel } from "@/app/_hooks/useInfiniteCarousel";

vi.mock("@/app/_utils/const", () => ({
  PAGE_SIZE: 5,
  PICSUM_BASE_URL: "https://picsum.photos/v2/list",
}));

vi.mock("@/app/_utils/carouselMath", () => ({
  stampPage: (
    rawItems: Array<
      Omit<
        {
          id: string;
          url: string;
          width: number;
          height: number;
          download_url: string;
        },
        "id"
      >
    >,
    slotIndex: number,
  ) => rawItems.map((item, i) => ({ ...item, id: `${slotIndex}-${i}` })),
}));

function makeApiPage(pageNum: number, count = 5) {
  return Array.from({ length: count }, (_, i) => ({
    id: `raw-${pageNum}-${i}`,
    download_url: `https://picsum.photos/id/${pageNum * count + i}/150/240`,
    width: 150,
    height: 240,
  }));
}

function makeApiResponse(pageNum: number, count = 5) {
  return {
    ok: true,
    status: 200,
    json: async () => makeApiPage(pageNum, count),
  } as unknown as Response;
}

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockImplementation((url: string) => {
    const match = url.match(/page=(\d+)/);
    const page = match ? parseInt(match[1]) : 1;
    return Promise.resolve(makeApiResponse(page));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

// ─── Render helper ────────────────────────────────────────────────────────────

function renderInfiniteCarousel(
  overrides: {
    totalItems?: number;
    itemWidth?: number;
    prefetchThreshold?: number;
  } = {},
) {
  const { totalItems = 50, itemWidth = 150, prefetchThreshold = 5 } = overrides;

  return renderHook(() =>
    useInfiniteCarousel({ totalItems, itemWidth, prefetchThreshold }),
  );
}

describe("useInfiniteCarousel – initial state", () => {
  test("starts with empty items array", () => {
    const { result } = renderInfiniteCarousel();
    expect(result.current.items).toEqual([]);
  });

  test("starts with isLoadingForward true while initial fetch is in flight", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { result } = renderInfiniteCarousel();
    expect(result.current.isLoadingForward).toBe(true);
  });

  test("starts with isLoadingBackward false", () => {
    const { result } = renderInfiniteCarousel();
    expect(result.current.isLoadingBackward).toBe(false);
  });

  test("starts with prependOffset 0", () => {
    const { result } = renderInfiniteCarousel();
    expect(result.current.prependOffset).toBe(0);
  });

  test("returns all expected fields", () => {
    const { result } = renderInfiniteCarousel();
    expect(typeof result.current.onScrollProgress).toBe("function");
    expect(typeof result.current.clearPrependOffset).toBe("function");
  });
});

describe("useInfiniteCarousel – initial load", () => {
  test("fetches 3 pages on mount (middle-1, middle, middle+1)", async () => {
    renderInfiniteCarousel({ totalItems: 50 });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));

    const urls: string[] = mockFetch.mock.calls.map(([url]: [string]) => url);
    expect(urls.some((u) => u.includes("page=4"))).toBe(true);
    expect(urls.some((u) => u.includes("page=5"))).toBe(true);
    expect(urls.some((u) => u.includes("page=6"))).toBe(true);
  });

  test("populates items after initial fetch completes", async () => {
    const { result } = renderInfiniteCarousel();
    await waitFor(() => expect(result.current.items.length).toBeGreaterThan(0));
    expect(result.current.items).toHaveLength(15);
  });

  test("sets isLoadingForward to false after load completes", async () => {
    const { result } = renderInfiniteCarousel();
    await waitFor(() => expect(result.current.isLoadingForward).toBe(false));
  });

  test("items have unique ids (no duplicates)", async () => {
    const { result } = renderInfiniteCarousel();
    await waitFor(() => expect(result.current.items.length).toBe(15));

    const ids = result.current.items.map((item) => item.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test("does not update state if unmounted before fetch completes", async () => {
    let resolve!: (r: Response) => void;
    mockFetch.mockImplementation(
      () =>
        new Promise((res) => {
          resolve = res;
        }),
    );

    const { result, unmount } = renderInfiniteCarousel();
    unmount();

    await act(async () => {
      resolve(makeApiResponse(1));
    });

    expect(result.current.items).toEqual([]);
  });

  test("handles fetch error gracefully — items stays empty", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));
    const { result } = renderInfiniteCarousel();
    await waitFor(() => expect(result.current.isLoadingForward).toBe(false));
    expect(result.current.items).toEqual([]);
  });

  test("handles non-ok HTTP response — throws and items stays empty", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => [],
    } as unknown as Response);

    const { result } = renderInfiniteCarousel();
    await waitFor(() => expect(result.current.isLoadingForward).toBe(false));
    expect(result.current.items).toEqual([]);
  });
});

describe("useInfiniteCarousel – page caching", () => {
  test("does not re-fetch a page that is already cached", async () => {
    const { result } = renderInfiniteCarousel({ totalItems: 50 });
    await waitFor(() => expect(result.current.items.length).toBe(15));

    const fetchCountAfterInit = mockFetch.mock.calls.length;

    act(() => {
      result.current.onScrollProgress(10, 14);
    });

    await waitFor(() =>
      expect(result.current.items.length).toBeGreaterThan(15),
    );

    const newFetchCount = mockFetch.mock.calls.length - fetchCountAfterInit;
    expect(newFetchCount).toBe(1);
  });
});

describe("useInfiniteCarousel – appendPage", () => {
  test("appends items when lastVisible is near the end", async () => {
    const { result } = renderInfiniteCarousel();
    await waitFor(() => expect(result.current.items.length).toBe(15));

    act(() => {
      result.current.onScrollProgress(0, 14);
    });

    await waitFor(() => expect(result.current.items.length).toBe(20));
    expect(result.current.isLoadingForward).toBe(false);
  });

  test("sets isLoadingForward true while appending", async () => {
    let resolveAppend!: (r: Response) => void;
    const { result } = renderInfiniteCarousel();
    await waitFor(() => expect(result.current.items.length).toBe(15));

    mockFetch.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveAppend = res;
        }),
    );

    act(() => {
      result.current.onScrollProgress(0, 14);
    });
    await waitFor(() => expect(result.current.isLoadingForward).toBe(true));

    await act(async () => {
      resolveAppend(makeApiResponse(7));
    });
    await waitFor(() => expect(result.current.isLoadingForward).toBe(false));
  });

  test("does not append if already fetching forward (mutex)", async () => {
    const { result } = renderInfiniteCarousel();
    await waitFor(() => expect(result.current.items.length).toBe(15));

    mockFetch.mockImplementation(() => new Promise(() => {}));
    mockFetch.mockClear();

    act(() => {
      result.current.onScrollProgress(0, 14);
    });
    act(() => {
      result.current.onScrollProgress(0, 14);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("does nothing when loadedSlots is empty", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { result } = renderInfiniteCarousel();

    act(() => {
      result.current.onScrollProgress(0, 14);
    });

    expect(result.current.items).toHaveLength(0);
  });

  test("wraps page number circularly when reaching the last page", async () => {
    const { result } = renderInfiniteCarousel({ totalItems: 10 });
    await waitFor(() => expect(result.current.items.length).toBeGreaterThan(0));

    mockFetch.mockClear();
    act(() => {
      const len = result.current.items.length;
      result.current.onScrollProgress(len - 5, len - 1);
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const urls: string[] = mockFetch.mock.calls.map(([url]: [string]) => url);
    urls.forEach((url) => {
      const match = url.match(/page=(\d+)/);
      if (match) expect(parseInt(match[1])).toBeLessThanOrEqual(2);
    });
  });
});

describe("useInfiniteCarousel – prependPage", () => {
  test("prepends items when firstVisible is near the start", async () => {
    const { result } = renderInfiniteCarousel();
    await waitFor(() => expect(result.current.items.length).toBe(15));

    const initialItems = result.current.items;
    act(() => {
      result.current.onScrollProgress(0, 4);
    });

    await waitFor(() => expect(result.current.items.length).toBe(20));
    expect(result.current.items[0].id).not.toBe(initialItems[0].id);
  });

  test("sets isLoadingBackward true while prepending", async () => {
    let resolvePrepend!: (r: Response) => void;
    const { result } = renderInfiniteCarousel();
    await waitFor(() => expect(result.current.items.length).toBe(15));

    mockFetch.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolvePrepend = res;
        }),
    );

    act(() => {
      result.current.onScrollProgress(0, 4);
    });
    await waitFor(() => expect(result.current.isLoadingBackward).toBe(true));

    await act(async () => {
      resolvePrepend(makeApiResponse(3));
    });
    await waitFor(() => expect(result.current.isLoadingBackward).toBe(false));
  });

  test("sets prependOffset to newImages.length * itemWidth after prepend", async () => {
    const { result } = renderInfiniteCarousel({ itemWidth: 150 });
    await waitFor(() => expect(result.current.items.length).toBe(15));

    act(() => {
      result.current.onScrollProgress(0, 4);
    });

    await waitFor(() => expect(result.current.prependOffset).toBe(750));
  });

  test("does not prepend if already fetching backward (mutex)", async () => {
    const { result } = renderInfiniteCarousel();
    await waitFor(() => expect(result.current.items.length).toBe(15));

    mockFetch.mockImplementation(() => new Promise(() => {}));
    mockFetch.mockClear();

    act(() => {
      result.current.onScrollProgress(0, 4);
    });
    act(() => {
      result.current.onScrollProgress(0, 4);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("useInfiniteCarousel – clearPrependOffset", () => {
  test("resets prependOffset to 0", async () => {
    const { result } = renderInfiniteCarousel({ itemWidth: 150 });
    await waitFor(() => expect(result.current.items.length).toBe(15));

    act(() => {
      result.current.onScrollProgress(0, 4);
    });
    await waitFor(() =>
      expect(result.current.prependOffset).toBeGreaterThan(0),
    );

    act(() => {
      result.current.clearPrependOffset();
    });
    expect(result.current.prependOffset).toBe(0);
  });
});

describe("useInfiniteCarousel – onScrollProgress edge cases", () => {
  test("does nothing when totalLoaded is 0 (called before init)", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { result } = renderInfiniteCarousel();

    expect(() => {
      act(() => {
        result.current.onScrollProgress(0, 0);
      });
    }).not.toThrow();
  });

  test("does not trigger append or prepend when in the middle zone", async () => {
    const { result } = renderInfiniteCarousel({ prefetchThreshold: 2 });
    await waitFor(() => expect(result.current.items.length).toBe(15));

    mockFetch.mockClear();
    act(() => {
      result.current.onScrollProgress(5, 9);
    });
    await act(async () => {});

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("can trigger both append and prepend in a single call", async () => {
    const { result } = renderInfiniteCarousel({ prefetchThreshold: 10 });
    await waitFor(() => expect(result.current.items.length).toBe(15));

    mockFetch.mockClear();
    act(() => {
      result.current.onScrollProgress(0, 14);
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});
