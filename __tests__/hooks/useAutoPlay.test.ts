import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useAutoPlay } from "@/app/_hooks/useAutoPlay";

vi.mock("@/app/_utils/const", () => ({
  INERTIA_QUIET_MS: 100,
}));

let rafCallbacks: Map<number, FrameRequestCallback>;
let rafIdCounter: number;

function flushRaf(timestamp = 16) {
  const cbs = [...rafCallbacks.entries()];
  rafCallbacks.clear();
  cbs.forEach(([, cb]) => cb(timestamp));
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

  vi.spyOn(Date, "now").mockReturnValue(10_000);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeContainer(initialScrollLeft = 0) {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollLeft", {
    configurable: true,
    get() {
      return this._scrollLeft ?? initialScrollLeft;
    },
    set(v) {
      this._scrollLeft = v;
    },
  });
  return el;
}

interface HookOptions {
  speed?: number;
  direction?: "left" | "right";
  paused?: boolean;
  lastScrollTs?: number;
}

function renderAutoPlay({
  speed = 2,
  direction = "right",
  paused = false,
  lastScrollTs = 0,
}: HookOptions = {}) {
  const container = makeContainer();
  const containerRef = { current: container };
  const pauseRef = { current: paused };
  const lastScrollTimestampRef = { current: lastScrollTs };

  const { result, unmount, rerender } = renderHook(
    ({ speed, direction }: { speed: number; direction: "left" | "right" }) =>
      useAutoPlay({
        containerRef,
        speed,
        direction,
        pauseRefs: [pauseRef],
        lastScrollTimestampRef,
      }),
    { initialProps: { speed, direction } },
  );

  return {
    container,
    containerRef,
    pauseRef,
    lastScrollTimestampRef,
    result,
    unmount,
    rerender,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useAutoPlay – basic scrolling", () => {
  test("increments scrollLeft on each RAF tick when direction is right", () => {
    const { container } = renderAutoPlay({ speed: 2, direction: "right" });

    act(() => flushRaf(16));
    act(() => flushRaf(33));

    expect(container.scrollLeft).toBeGreaterThan(0);
  });

  test("decrements scrollLeft when direction is left", () => {
    const container = makeContainer(500);
    const containerRef = { current: container };
    const pauseRef = { current: false };
    const lastScrollTimestampRef = { current: 0 };

    renderHook(() =>
      useAutoPlay({
        containerRef,
        speed: 2,
        direction: "left",
        pauseRefs: [pauseRef],
        lastScrollTimestampRef,
      }),
    );

    act(() => flushRaf(16));
    act(() => flushRaf(33));

    expect(container.scrollLeft).toBeLessThan(500);
  });

  test("does not scroll when container ref is null", () => {
    const containerRef = { current: null as HTMLDivElement | null };
    const pauseRef = { current: false };
    const lastScrollTimestampRef = { current: 0 };

    renderHook(() =>
      useAutoPlay({
        containerRef,
        speed: 2,
        direction: "right",
        pauseRefs: [pauseRef],
        lastScrollTimestampRef,
      }),
    );

    expect(() => {
      act(() => flushRaf(16));
      act(() => flushRaf(33));
    }).not.toThrow();
  });
});

describe("useAutoPlay – pause behaviour", () => {
  test("does not scroll when a pauseRef is true", () => {
    const { container, pauseRef } = renderAutoPlay({ speed: 2, paused: true });

    act(() => flushRaf(16));
    act(() => flushRaf(33));

    expect(container.scrollLeft).toBe(0);
  });

  test("resumes scrolling after pauseRef is set back to false", () => {
    const { container, pauseRef } = renderAutoPlay({ speed: 2, paused: true });

    act(() => flushRaf(16));
    act(() => flushRaf(33));
    expect(container.scrollLeft).toBe(0);

    pauseRef.current = false;

    act(() => flushRaf(50));
    act(() => flushRaf(67));

    expect(container.scrollLeft).toBeGreaterThan(0);
  });

  test("stops scrolling when pauseRef transitions to true mid-run", () => {
    const { container, pauseRef } = renderAutoPlay({ speed: 2, paused: false });

    act(() => flushRaf(16));
    act(() => flushRaf(33));
    const scrollAfterFirstTicks = container.scrollLeft;

    pauseRef.current = true;
    act(() => flushRaf(50));
    act(() => flushRaf(67));

    expect(container.scrollLeft).toBe(scrollAfterFirstTicks);
  });

  test("respects multiple pauseRefs — stops if any is true", () => {
    const container = makeContainer();
    const containerRef = { current: container };
    const pauseA = { current: false };
    const pauseB = { current: true };
    const lastScrollTimestampRef = { current: 0 };

    renderHook(() =>
      useAutoPlay({
        containerRef,
        speed: 2,
        direction: "right",
        pauseRefs: [pauseA, pauseB],
        lastScrollTimestampRef,
      }),
    );

    act(() => flushRaf(16));
    act(() => flushRaf(33));

    expect(container.scrollLeft).toBe(0);
  });
});

describe("useAutoPlay – coasting (inertia quiet window)", () => {
  test("does not scroll while within INERTIA_QUIET_MS of last user scroll", () => {
    const { container } = renderAutoPlay({ speed: 2, lastScrollTs: 9_950 });

    act(() => flushRaf(16));
    act(() => flushRaf(33));

    expect(container.scrollLeft).toBe(0);
  });

  test("resumes scrolling once the inertia window has passed", () => {
    const lastScrollTimestampRef = { current: 9_950 };
    const container = makeContainer();
    const containerRef = { current: container };
    const pauseRef = { current: false };

    renderHook(() =>
      useAutoPlay({
        containerRef,
        speed: 2,
        direction: "right",
        pauseRefs: [pauseRef],
        lastScrollTimestampRef,
      }),
    );

    act(() => flushRaf(16));
    act(() => flushRaf(33));
    expect(container.scrollLeft).toBe(0);

    vi.spyOn(Date, "now").mockReturnValue(10_200);

    act(() => flushRaf(50));
    act(() => flushRaf(67));

    expect(container.scrollLeft).toBeGreaterThan(0);
  });
});

describe("useAutoPlay – speed & delta", () => {
  test("higher speed results in larger scrollLeft increment", () => {
    const slow = makeContainer();
    const fast = makeContainer();

    const makeOpts = (el: HTMLDivElement, speed: number) => ({
      containerRef: { current: el },
      speed,
      direction: "right" as const,
      pauseRefs: [{ current: false }],
      lastScrollTimestampRef: { current: 0 },
    });

    renderHook(() => useAutoPlay(makeOpts(slow, 1)));
    const slowHook = renderHook(() => useAutoPlay(makeOpts(fast, 4)));

    act(() => flushRaf(16));
    act(() => flushRaf(33));

    expect(fast.scrollLeft).toBeGreaterThan(slow.scrollLeft);
  });

  test("clamps delta to 64ms to prevent huge jumps on tab switch", () => {
    const { container } = renderAutoPlay({ speed: 10 });

    act(() => flushRaf(16));
    act(() => flushRaf(16 + 5000));

    expect(container.scrollLeft).toBeLessThan(50);
  });
});

describe("useAutoPlay – direction prop update", () => {
  test("picks up direction change without remounting", () => {
    const container = makeContainer(500);
    const containerRef = { current: container };
    const pauseRef = { current: false };
    const lastScrollTimestampRef = { current: 0 };

    const { rerender } = renderHook(
      ({ direction }: { direction: "left" | "right" }) =>
        useAutoPlay({
          containerRef,
          speed: 2,
          direction,
          pauseRefs: [pauseRef],
          lastScrollTimestampRef,
        }),
      { initialProps: { direction: "right" as const } },
    );

    act(() => flushRaf(16));
    act(() => flushRaf(33));
    expect(container.scrollLeft).toBeGreaterThan(500);

    const scrollAfterRight = container.scrollLeft;

    rerender({ direction: "left" });
    act(() => flushRaf(50));
    act(() => flushRaf(67));

    expect(container.scrollLeft).toBeLessThan(scrollAfterRight);
  });
});

describe("useAutoPlay – cleanup", () => {
  test("cancels the RAF loop on unmount", () => {
    const { unmount } = renderAutoPlay();

    act(() => flushRaf(16));
    const pendingBefore = rafCallbacks.size;
    expect(pendingBefore).toBeGreaterThan(0);

    unmount();

    expect(rafCallbacks.size).toBe(0);
  });

  test("stops scrolling after unmount", () => {
    const { container, unmount } = renderAutoPlay({ speed: 2 });

    act(() => flushRaf(16));
    act(() => flushRaf(33));
    const scrollAtUnmount = container.scrollLeft;

    unmount();

    act(() => flushRaf(50));

    expect(container.scrollLeft).toBe(scrollAtUnmount);
  });
});
