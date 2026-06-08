import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDragScroll } from "@/app/_hooks/useDragScroll";

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

function makeMockEvent(overrides: Record<string, unknown> = {}) {
  return { preventDefault: vi.fn(), ...overrides } as unknown;
}

function renderDragScroll(
  initialScrollLeft = 0,
  onScrollChange?: (n: number) => void,
) {
  const container = makeContainer(initialScrollLeft);
  const containerRef = { current: container };

  const { result } = renderHook(() =>
    useDragScroll({ containerRef, onScrollChange }),
  );

  return { container, containerRef, result };
}

describe("useDragScroll – initial state", () => {
  test("isDragging ref starts as false", () => {
    const { result } = renderDragScroll();
    expect(result.current.isDragging.current).toBe(false);
  });

  test("returns all expected handler functions", () => {
    const { result } = renderDragScroll();
    expect(typeof result.current.onMouseDown).toBe("function");
    expect(typeof result.current.onMouseUp).toBe("function");
    expect(typeof result.current.onMouseMove).toBe("function");
    expect(typeof result.current.onTouchStart).toBe("function");
    expect(typeof result.current.onTouchMove).toBe("function");
    expect(typeof result.current.onTouchEnd).toBe("function");
  });
});

describe("useDragScroll – mouse drag", () => {
  test("mousedown sets isDragging to true", () => {
    const { result } = renderDragScroll();

    act(() => {
      result.current.onMouseDown(
        makeMockEvent({ clientX: 100 }) as React.MouseEvent,
      );
    });

    expect(result.current.isDragging.current).toBe(true);
  });

  test("mousedown calls preventDefault", () => {
    const { result } = renderDragScroll();
    const event = makeMockEvent({ clientX: 100 }) as React.MouseEvent & {
      preventDefault: ReturnType<typeof vi.fn>;
    };

    act(() => {
      result.current.onMouseDown(event);
    });

    expect((event as any).preventDefault).toHaveBeenCalledTimes(1);
  });

  test("mousemove updates scrollLeft while dragging", () => {
    const { container, result } = renderDragScroll(200); // start at 200

    act(() => {
      result.current.onMouseDown(
        makeMockEvent({ clientX: 300 }) as React.MouseEvent,
      );
    });
    act(() => {
      result.current.onMouseMove(
        makeMockEvent({ clientX: 250 }) as React.MouseEvent,
      );
    });

    expect(container.scrollLeft).toBe(250);
  });

  test("dragging right (clientX increases) scrolls left", () => {
    const { container, result } = renderDragScroll(200);

    act(() => {
      result.current.onMouseDown(
        makeMockEvent({ clientX: 100 }) as React.MouseEvent,
      );
    });
    act(() => {
      result.current.onMouseMove(
        makeMockEvent({ clientX: 150 }) as React.MouseEvent,
      );
    });

    expect(container.scrollLeft).toBe(150);
  });

  test("mousemove before mousedown has no effect on scrollLeft", () => {
    const { container, result } = renderDragScroll(100);

    act(() => {
      result.current.onMouseMove(
        makeMockEvent({ clientX: 50 }) as React.MouseEvent,
      );
    });

    expect(container.scrollLeft).toBe(100);
  });

  test("mouseup sets isDragging to false", () => {
    const { result } = renderDragScroll();

    act(() => {
      result.current.onMouseDown(
        makeMockEvent({ clientX: 100 }) as React.MouseEvent,
      );
    });
    expect(result.current.isDragging.current).toBe(true);

    act(() => {
      result.current.onMouseUp(makeMockEvent() as React.MouseEvent);
    });
    expect(result.current.isDragging.current).toBe(false);
  });

  test("mousemove after mouseup does not change scrollLeft", () => {
    const { container, result } = renderDragScroll(100);

    act(() => {
      result.current.onMouseDown(
        makeMockEvent({ clientX: 200 }) as React.MouseEvent,
      );
    });
    act(() => {
      result.current.onMouseUp(makeMockEvent() as React.MouseEvent);
    });
    act(() => {
      result.current.onMouseMove(
        makeMockEvent({ clientX: 100 }) as React.MouseEvent,
      );
    });

    expect(container.scrollLeft).toBe(100);
  });

  test("multiple sequential drags each start from the current scrollLeft", () => {
    const { container, result } = renderDragScroll(0);

    act(() => {
      result.current.onMouseDown(
        makeMockEvent({ clientX: 100 }) as React.MouseEvent,
      );
    });
    act(() => {
      result.current.onMouseMove(
        makeMockEvent({ clientX: 50 }) as React.MouseEvent,
      );
    });
    act(() => {
      result.current.onMouseUp(makeMockEvent() as React.MouseEvent);
    });
    expect(container.scrollLeft).toBe(50);

    act(() => {
      result.current.onMouseDown(
        makeMockEvent({ clientX: 200 }) as React.MouseEvent,
      );
    });
    act(() => {
      result.current.onMouseMove(
        makeMockEvent({ clientX: 170 }) as React.MouseEvent,
      );
    });

    expect(container.scrollLeft).toBe(80);
  });
});

describe("useDragScroll – touch drag", () => {
  function makeTouchEvent(clientX: number) {
    return {
      preventDefault: vi.fn(),
      touches: [{ clientX }],
    } as unknown;
  }

  test("touchstart sets isDragging to true", () => {
    const { result } = renderDragScroll();

    act(() => {
      result.current.onTouchStart(makeTouchEvent(100) as React.TouchEvent);
    });

    expect(result.current.isDragging.current).toBe(true);
  });

  test("touchmove updates scrollLeft while dragging", () => {
    const { container, result } = renderDragScroll(200);

    act(() => {
      result.current.onTouchStart(makeTouchEvent(300) as React.TouchEvent);
    });
    act(() => {
      result.current.onTouchMove(makeTouchEvent(250) as React.TouchEvent);
    });

    expect(container.scrollLeft).toBe(250);
  });

  test("touchmove calls preventDefault", () => {
    const { result } = renderDragScroll();
    const event = makeTouchEvent(100) as React.TouchEvent & {
      preventDefault: ReturnType<typeof vi.fn>;
    };

    act(() => {
      result.current.onTouchStart(event);
    });
    act(() => {
      result.current.onTouchMove(event);
    });

    expect((event as any).preventDefault).toHaveBeenCalled();
  });

  test("touchmove before touchstart has no effect", () => {
    const { container, result } = renderDragScroll(100);

    act(() => {
      result.current.onTouchMove(makeTouchEvent(50) as React.TouchEvent);
    });

    expect(container.scrollLeft).toBe(100);
  });

  test("touchend sets isDragging to false", () => {
    const { result } = renderDragScroll();

    act(() => {
      result.current.onTouchStart(makeTouchEvent(100) as React.TouchEvent);
    });
    expect(result.current.isDragging.current).toBe(true);

    act(() => {
      result.current.onTouchEnd();
    });
    expect(result.current.isDragging.current).toBe(false);
  });

  test("touchmove after touchend does not scroll", () => {
    const { container, result } = renderDragScroll(100);

    act(() => {
      result.current.onTouchStart(makeTouchEvent(200) as React.TouchEvent);
    });
    act(() => {
      result.current.onTouchEnd();
    });
    act(() => {
      result.current.onTouchMove(makeTouchEvent(100) as React.TouchEvent);
    });

    expect(container.scrollLeft).toBe(100);
  });
});

describe("useDragScroll – containerRef is null", () => {
  test("mousemove does not throw when containerRef.current is null", () => {
    const containerRef = { current: null as HTMLDivElement | null };
    const { result } = renderHook(() => useDragScroll({ containerRef }));

    expect(() => {
      act(() => {
        result.current.onMouseDown({
          clientX: 100,
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
        result.current.onMouseMove({ clientX: 50 } as React.MouseEvent);
      });
    }).not.toThrow();
  });

  test("touchmove does not throw when containerRef.current is null", () => {
    const containerRef = { current: null as HTMLDivElement | null };
    const { result } = renderHook(() => useDragScroll({ containerRef }));

    expect(() => {
      act(() => {
        result.current.onTouchStart({
          touches: [{ clientX: 100 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent);
        result.current.onTouchMove({
          touches: [{ clientX: 50 }],
          preventDefault: vi.fn(),
        } as unknown as React.TouchEvent);
      });
    }).not.toThrow();
  });
});

describe("useDragScroll – scrollLeft capture on mousedown", () => {
  test("captures scrollLeft at mousedown time, not at mousemove time", () => {
    const { container, result } = renderDragScroll(0);

    act(() => {
      result.current.onMouseDown(
        makeMockEvent({ clientX: 100 }) as React.MouseEvent,
      );
    });

    container.scrollLeft = 999;

    act(() => {
      result.current.onMouseMove(
        makeMockEvent({ clientX: 80 }) as React.MouseEvent,
      );
    });
    expect(container.scrollLeft).toBe(20);
  });
});
