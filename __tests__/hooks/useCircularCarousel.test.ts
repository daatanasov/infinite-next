import {
  beforeEach,
  afterEach,
  describe,
  expect,
  test,
  vi,
  type Mock,
} from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCircularCarousel } from "@/app/_hooks/useCircularCarousel";

vi.mock("@/app/_utils/const", () => ({
  BUFFER_PAGES: 3,
  SETTLE_FRAMES: 2,
}));

vi.mock("@/app/_utils/carouselMath", () => ({
  buildInitialWindow: (
    startPage: number,
    windowPages: number,
    wrap: (p: number) => number,
  ) => Array.from({ length: windowPages }, (_, i) => wrap(startPage + i)),
  computeTriggerPx: (pageSize: number, itemWidth: number) =>
    pageSize * itemWidth,
  rotateForward: (pages: number[]) => [
    ...pages.slice(1),
    pages[pages.length - 1] + 1,
  ],
  rotateBackward: (pages: number[]) => [pages[0] - 1, ...pages.slice(0, -1)],
  wrapPage: (p: number, total: number) => ((p - 1 + total) % total) + 1,
}));

const mockFetchPicsumPage = vi.fn();
vi.mock("@/app/_utils/api", () => ({
  fetchPicsumPage: (...args: unknown[]) => mockFetchPicsumPage(...args),
}));

const mockReducer = vi.fn();
vi.mock("@/app/_utils/reducer", () => ({
  reducer: (state: unknown, action: { type: string; [k: string]: unknown }) =>
    mockReducer(state, action),
}));

let rafCallbacks: Map<number, FrameRequestCallback>;
let rafIdCounter = 0;

function flushAllRaf(timestamp = 16) {
  let iterations = 0;
  while (rafCallbacks.size > 0 && iterations++ < 100) {
    const cbs = [...rafCallbacks.entries()];
    rafCallbacks.clear();
    cbs.forEach(([, cb]) => cb(timestamp));
  }
}

function makePage(n = 5, pageIndex = 0) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${pageIndex * n + i}`,
    url: `https://picsum.photos/id/${pageIndex * n + i}/150/240`,
    download_url: `https://picsum.photos/id/${pageIndex * n + i}/150/240`,
    width: 150,
    height: 240,
  }));
}

function successResult(data: unknown[]) {
  return { ok: true, data };
}

function makeReducerState(overrides = {}) {
  return {
    items: [],
    isLoadingForward: false,
    isLoadingBackward: false,
    error: null,
    ...overrides,
  };
}

beforeEach(() => {
  rafCallbacks = new Map();
  rafIdCounter = 0;

  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = ++rafIdCounter;
    rafCallbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    rafCallbacks.delete(id);
  });

  let reducerState = makeReducerState();
  mockReducer.mockImplementation(
    (_state: unknown, action: { type: string; [k: string]: unknown }) => {
      if (action.type === "LOAD_START") {
        if (action.direction === "forward")
          reducerState = { ...reducerState, isLoadingForward: true };
        if (action.direction === "backward")
          reducerState = { ...reducerState, isLoadingBackward: true };
      }
      if (action.type === "LOAD_SUCCESS") {
        reducerState = {
          ...reducerState,
          isLoadingForward: false,
          isLoadingBackward: false,
          items: action.items as [],
        };
      }
      if (action.type === "LOAD_ERROR") {
        reducerState = {
          ...reducerState,
          isLoadingForward: false,
          isLoadingBackward: false,
          error: action.message as string,
        };
      }
      if (action.type === "CLEAR_ERROR") {
        reducerState = { ...reducerState, error: null };
      }
      return reducerState;
    },
  );

  mockFetchPicsumPage.mockResolvedValue(successResult(makePage()));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mockFetchPicsumPage.mockReset();
  mockReducer.mockReset();
});

function makeContainer(scrollLeft = 0) {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollLeft", {
    configurable: true,
    get() {
      return this._scrollLeft ?? scrollLeft;
    },
    set(v) {
      this._scrollLeft = v;
    },
  });
  return el;
}

function renderCarousel(
  overrides: {
    itemWidth?: number;
    totalItems?: number;
    pageSize?: number;
    containerEl?: HTMLDivElement | null;
  } = {},
) {
  const {
    itemWidth = 164,
    totalItems = 100,
    pageSize = 20,
    containerEl = makeContainer(),
  } = overrides;

  const containerRef = { current: containerEl };

  const { result, unmount, rerender } = renderHook(() =>
    useCircularCarousel(itemWidth, containerRef, { totalItems, pageSize }),
  );

  return { result, unmount, rerender, containerRef };
}

describe("useCircularCarousel – initial return values", () => {
  test("returns windowItems = min(BUFFER_PAGES, totalPages) * pageSize", () => {
    const { result } = renderCarousel();
    expect(result.current.windowItems).toBe(60);
  });

  test("returns correct initialScrollLeft (center of total track width)", () => {
    const { result } = renderCarousel({
      itemWidth: 164,
      totalItems: 100,
      pageSize: 20,
    });
    expect(result.current.initialScrollLeft).toBe(4920);
  });

  test("returns onScroll, clearError as functions", () => {
    const { result } = renderCarousel();
    expect(typeof result.current.onScroll).toBe("function");
    expect(typeof result.current.clearError).toBe("function");
  });

  test("windowItems is capped by totalPages when totalItems is small", () => {
    const { result } = renderCarousel({ totalItems: 20, pageSize: 20 });
    expect(result.current.windowItems).toBe(20);
  });
});

describe("useCircularCarousel – initial load", () => {
  test("triggers fetchPicsumPage for each page in the initial window", async () => {
    renderCarousel();
    await waitFor(() => {
      expect(mockFetchPicsumPage).toHaveBeenCalled();
    });
    expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3);
  });

  test("sets scrollLeft to centerScroll after successful load", async () => {
    const el = makeContainer(0);
    renderCarousel({ containerEl: el });

    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3));
    expect(el.scrollLeft).toBe(4920);
  });

  test("dispatches LOAD_START with direction forward on mount", async () => {
    renderCarousel();
    await waitFor(() => {
      expect(mockReducer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: "LOAD_START", direction: "forward" }),
      );
    });
  });

  test("dispatches LOAD_SUCCESS after pages resolve", async () => {
    renderCarousel();
    await waitFor(() => {
      expect(mockReducer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: "LOAD_SUCCESS" }),
      );
    });
  });

  test("dispatches LOAD_ERROR when fetchPicsumPage rejects", async () => {
    mockFetchPicsumPage.mockRejectedValue(new Error("network error"));
    renderCarousel();

    await waitFor(() => {
      expect(mockReducer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: "LOAD_ERROR" }),
      );
    });
  });

  test("dispatches LOAD_ERROR when fetchPicsumPage returns http error", async () => {
    mockFetchPicsumPage.mockResolvedValue({
      ok: false,
      reason: "http",
      status: 500,
    });
    renderCarousel();

    await waitFor(() => {
      expect(mockReducer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: "LOAD_ERROR" }),
      );
    });
  });

  test("aborts fetch on unmount — does not dispatch after abort", async () => {
    mockFetchPicsumPage.mockImplementation(
      (_page: unknown, signal: AbortSignal) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );

    const { unmount } = renderCarousel();
    mockReducer.mockClear();

    unmount();

    await act(async () => {});

    expect(mockReducer).not.toHaveBeenCalled();
  });
});

describe("useCircularCarousel – onScroll triggering rotation", () => {
  test("does not rotate when scrollLeft is in the middle zone", async () => {
    const { result } = renderCarousel();
    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3));
    mockFetchPicsumPage.mockClear();

    act(() => {
      result.current.onScroll(4920);
    });

    await act(async () => {});
    expect(mockFetchPicsumPage).not.toHaveBeenCalled();
  });

  test("triggers rotateForward when scrollLeft reaches the right edge", async () => {
    const { result } = renderCarousel({
      itemWidth: 164,
      totalItems: 100,
      pageSize: 20,
    });
    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3));
    mockFetchPicsumPage.mockClear();
    mockFetchPicsumPage.mockResolvedValue(successResult(makePage(20, 3)));

    act(() => {
      result.current.onScroll(9840);
    });

    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalled());
    act(() => flushAllRaf());
    await act(async () => {});
  });

  test("triggers rotateBackward when scrollLeft reaches the left edge", async () => {
    const { result } = renderCarousel({
      itemWidth: 164,
      totalItems: 100,
      pageSize: 20,
    });
    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3));
    mockFetchPicsumPage.mockClear();
    mockFetchPicsumPage.mockResolvedValue(successResult(makePage(20, 0)));

    act(() => {
      result.current.onScroll(0);
    });

    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalled());
    act(() => flushAllRaf());
    await act(async () => {});
  });

  test("ignores onScroll calls while rotation is in progress", async () => {
    const { result } = renderCarousel();
    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3));

    let resolveFetch!: () => void;
    mockFetchPicsumPage.mockImplementation(
      () =>
        new Promise((res) => {
          resolveFetch = () => res(successResult(makePage()));
        }),
    );
    mockFetchPicsumPage.mockClear();

    act(() => {
      result.current.onScroll(9840);
    });
    act(() => {
      result.current.onScroll(9840);
    });

    expect(mockFetchPicsumPage).toHaveBeenCalledTimes(1);

    // Cleanup
    resolveFetch();
    act(() => flushAllRaf());
    await act(async () => {});
  });
});

describe("useCircularCarousel – rotate forward", () => {
  test("dispatches LOAD_START forward then LOAD_SUCCESS after rotate", async () => {
    const { result } = renderCarousel();
    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3));
    mockFetchPicsumPage.mockResolvedValue(successResult(makePage(20, 4)));
    mockReducer.mockClear();

    act(() => {
      result.current.onScroll(9840);
    });
    act(() => flushAllRaf());
    await waitFor(() => {
      const calls = mockReducer.mock.calls.map(([, a]) => a.type);
      expect(calls).toContain("LOAD_START");
      expect(calls).toContain("LOAD_SUCCESS");
    });
  });

  test("dispatches LOAD_ERROR when forward fetch fails", async () => {
    const { result } = renderCarousel();
    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3));
    mockFetchPicsumPage.mockRejectedValue(new Error("forward fail"));
    mockReducer.mockClear();

    act(() => {
      result.current.onScroll(9840);
    });

    await waitFor(() => {
      expect(mockReducer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "LOAD_ERROR",
          message: "Failed to load next images.",
        }),
      );
    });
  });
});

describe("useCircularCarousel – rotate backward", () => {
  test("dispatches LOAD_START backward then LOAD_SUCCESS after rotate", async () => {
    const { result } = renderCarousel();
    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3));
    mockFetchPicsumPage.mockResolvedValue(successResult(makePage(20, 0)));
    mockReducer.mockClear();

    act(() => {
      result.current.onScroll(0);
    });
    act(() => flushAllRaf());
    await waitFor(() => {
      const calls = mockReducer.mock.calls.map(([, a]) => a.type);
      expect(calls).toContain("LOAD_START");
      expect(calls).toContain("LOAD_SUCCESS");
    });
  });

  test("dispatches LOAD_ERROR when backward fetch fails", async () => {
    const { result } = renderCarousel();
    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3));
    mockFetchPicsumPage.mockRejectedValue(new Error("backward fail"));
    mockReducer.mockClear();

    act(() => {
      result.current.onScroll(0);
    });

    await waitFor(() => {
      expect(mockReducer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "LOAD_ERROR",
          message: "Failed to load previous images.",
        }),
      );
    });
  });
});

describe("useCircularCarousel – waitForSettle", () => {
  test("resets scrollLeft to centerScroll after a rotation settles", async () => {
    const el = makeContainer(0);
    const { result } = renderCarousel({ containerEl: el });
    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3));

    el.scrollLeft = 9999;
    mockFetchPicsumPage.mockResolvedValue(successResult(makePage()));

    act(() => {
      result.current.onScroll(9840);
    });
    act(() => flushAllRaf());
    await act(async () => {});

    expect(el.scrollLeft).toBe(4920);
  });
});

describe("useCircularCarousel – clearError", () => {
  test("dispatches CLEAR_ERROR when called", async () => {
    const { result } = renderCarousel();
    await waitFor(() => expect(mockFetchPicsumPage).toHaveBeenCalledTimes(3));
    mockReducer.mockClear();

    act(() => {
      result.current.clearError();
    });

    expect(mockReducer).toHaveBeenCalledWith(expect.anything(), {
      type: "CLEAR_ERROR",
    });
  });
});

describe("useCircularCarousel – aborted fetch returns undefined", () => {
  test("does not dispatch LOAD_SUCCESS when fetch result is undefined (aborted)", async () => {
    mockFetchPicsumPage.mockResolvedValue({ ok: false, reason: "aborted" });

    renderCarousel();

    await act(async () => {});

    const successCalls = mockReducer.mock.calls.filter(
      ([, a]) => a.type === "LOAD_SUCCESS",
    );
    expect(successCalls).toHaveLength(0);
  });
});
