import { beforeEach, describe, expect, test, vi } from "vitest";
import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FetchCarousel from "@/app/_components/FetchCarousel";

vi.mock("@/app/_components/StaticCard", () => ({
  default: ({ image }: { image: { id: string | number } }) => (
    <div data-testid="static-card" data-id={image.id} />
  ),
}));

vi.mock("@/app/_components/Skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockOnScrollProgress = vi.fn();
const mockClearPrependOffset = vi.fn();

const defaultInfiniteCarousel = {
  items: Array.from({ length: 10 }, (_, i) => ({ id: i, url: `img-${i}` })),
  isLoadingForward: false,
  isLoadingBackward: false,
  prependOffset: 0,
  clearPrependOffset: mockClearPrependOffset,
  onScrollProgress: mockOnScrollProgress,
};

const mockUseInfiniteCarousel = vi.fn(
  (totalItems: number, itemWidth: number, prefetchThreshold: number) =>
    defaultInfiniteCarousel,
);

vi.mock("@/app/_hooks/useInfiniteCarousel", () => ({
  useInfiniteCarousel: (...args: [number, number, number]) =>
    mockUseInfiniteCarousel(...args),
}));

const buildVirtualItems = (count: number, itemSize: number) =>
  Array.from({ length: count }, (_, i) => ({
    key: i,
    index: i,
    start: i * itemSize,
    size: itemSize,
  }));

const mockGetVirtualItems = vi.fn(() => buildVirtualItems(5, 150));
const mockGetTotalSize = vi.fn(() => 1500);

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getVirtualItems: mockGetVirtualItems,
    getTotalSize: mockGetTotalSize,
    measureElement: vi.fn(),
  }),
}));

vi.stubGlobal("requestAnimationFrame", (_cb: FrameRequestCallback) => {
  return 1;
});
vi.stubGlobal("cancelAnimationFrame", vi.fn());

beforeEach(() => {
  Object.defineProperties(HTMLElement.prototype, {
    scrollLeft: {
      configurable: true,
      get() {
        return this._scrollLeft ?? 0;
      },
      set(v) {
        this._scrollLeft = v;
      },
    },
    clientWidth: {
      configurable: true,
      get: () => 800,
    },
    scrollWidth: {
      configurable: true,
      get: () => Number.MAX_SAFE_INTEGER,
    },
  });

  mockOnScrollProgress.mockReset();
  mockClearPrependOffset.mockReset();
  mockUseInfiniteCarousel.mockReturnValue({ ...defaultInfiniteCarousel });
  mockGetVirtualItems.mockReturnValue(buildVirtualItems(5, 150));
  mockGetTotalSize.mockReturnValue(1500);
});

describe("FetchCarousel – rendering", () => {
  test("renders the outer wrapper with data-testid", () => {
    render(<FetchCarousel />);
    expect(screen.getByTestId("fetch-carousel-wrapper")).toBeInTheDocument();
  });

  test("renders the scroll container with data-testid", () => {
    render(<FetchCarousel />);
    expect(screen.getByTestId("fetch-carousel-container")).toBeInTheDocument();
  });

  test("applies height style to the scroll container", () => {
    render(<FetchCarousel height={300} />);
    expect(screen.getByTestId("fetch-carousel-container")).toHaveStyle({
      height: "300px",
    });
  });

  test("renders track with total size from virtualizer", () => {
    mockGetTotalSize.mockReturnValue(9999);
    render(<FetchCarousel />);
    expect(screen.getByTestId("fetch-carousel-track")).toHaveStyle({
      width: "9999px",
    });
  });

  test("renders StaticCard for each virtual item that has data", () => {
    render(<FetchCarousel />);
    expect(screen.getAllByTestId("static-card")).toHaveLength(5);
  });

  test("renders Skeleton for virtual items with no data", () => {
    mockUseInfiniteCarousel.mockReturnValue({
      ...defaultInfiniteCarousel,
      items: [
        { id: 0, url: "url-0" },
        { id: 1, url: "url-1" },
      ],
    });
    mockGetVirtualItems.mockReturnValue(buildVirtualItems(5, 150));

    render(<FetchCarousel />);

    expect(screen.getAllByTestId("static-card")).toHaveLength(2);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(3);
  });
});

describe("FetchCarousel – loading indicators", () => {
  test("hides both edge indicators by default", () => {
    render(<FetchCarousel />);
    expect(
      screen.queryByTestId("fetch-carouse-loading-backward-indicator"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("fetch-carouse-loading-forward-indicator"),
    ).not.toBeInTheDocument();
  });

  test("shows left edge indicator when isLoadingBackward is true", () => {
    mockUseInfiniteCarousel.mockReturnValue({
      ...defaultInfiniteCarousel,
      isLoadingBackward: true,
    });
    render(<FetchCarousel />);
    expect(
      screen.getByTestId("fetch-carouse-loading-backward-indicator"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("fetch-carouse-loading-forward-indicator"),
    ).not.toBeInTheDocument();
  });

  test("shows right edge indicator when isLoadingForward is true", () => {
    mockUseInfiniteCarousel.mockReturnValue({
      ...defaultInfiniteCarousel,
      isLoadingForward: true,
    });
    render(<FetchCarousel />);
    expect(
      screen.getByTestId("fetch-carouse-loading-forward-indicator"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("fetch-carouse-loading-backward-indicator"),
    ).not.toBeInTheDocument();
  });
});

describe("FetchCarousel – scroll events", () => {
  test("calls onScrollProgress on scroll", () => {
    render(<FetchCarousel />);
    fireEvent.scroll(screen.getByTestId("fetch-carousel-container"));
    expect(mockOnScrollProgress).toHaveBeenCalledTimes(1);
  });

  test("passes first and last virtual item indices to onScrollProgress", () => {
    mockGetVirtualItems.mockReturnValue(buildVirtualItems(5, 150));
    render(<FetchCarousel />);
    fireEvent.scroll(screen.getByTestId("fetch-carousel-container"));
    expect(mockOnScrollProgress).toHaveBeenCalledWith(0, 4);
  });

  test("does not call onScrollProgress when virtual items list is empty", () => {
    mockGetVirtualItems.mockReturnValue([]);
    render(<FetchCarousel />);
    fireEvent.scroll(screen.getByTestId("fetch-carousel-container"));
    expect(mockOnScrollProgress).not.toHaveBeenCalled();
  });
});

describe("FetchCarousel – prepend offset", () => {
  test("calls clearPrependOffset when prependOffset is positive", () => {
    mockUseInfiniteCarousel.mockReturnValue({
      ...defaultInfiniteCarousel,
      prependOffset: 300,
    });
    render(<FetchCarousel />);
    expect(mockClearPrependOffset).toHaveBeenCalledTimes(1);
  });

  test("adjusts scrollLeft by prependOffset amount", () => {
    mockUseInfiniteCarousel.mockReturnValue({
      ...defaultInfiniteCarousel,
      prependOffset: 200,
    });
    render(<FetchCarousel />);
    const container = screen.getByTestId(
      "fetch-carousel-container",
    ) as HTMLElement;
    expect(container.scrollLeft).toBe(200);
  });

  test("does not call clearPrependOffset when prependOffset is 0", () => {
    render(<FetchCarousel />);
    expect(mockClearPrependOffset).not.toHaveBeenCalled();
  });
});

describe("FetchCarousel – drag interaction", () => {
  test("mousedown + mousemove updates scrollLeft", () => {
    render(<FetchCarousel />);
    const container = screen.getByTestId(
      "fetch-carousel-container",
    ) as HTMLElement;
    container.scrollLeft = 100;

    fireEvent.mouseDown(container, { clientX: 200 });
    fireEvent.mouseMove(container, { clientX: 150 });

    expect(container.scrollLeft).toBe(150);
  });

  test("mousemove before mousedown has no effect", () => {
    render(<FetchCarousel />);
    const container = screen.getByTestId(
      "fetch-carousel-container",
    ) as HTMLElement;
    container.scrollLeft = 50;

    fireEvent.mouseMove(container, { clientX: 100 });

    expect(container.scrollLeft).toBe(50);
  });

  test("stops dragging on mouseup", () => {
    render(<FetchCarousel />);
    const container = screen.getByTestId(
      "fetch-carousel-container",
    ) as HTMLElement;

    fireEvent.mouseDown(container, { clientX: 200 });
    fireEvent.mouseUp(container);
    fireEvent.mouseMove(container, { clientX: 100 });

    expect(container.scrollLeft).toBe(0);
  });

  test("stops dragging on mouseleave", () => {
    render(<FetchCarousel />);
    const container = screen.getByTestId(
      "fetch-carousel-container",
    ) as HTMLElement;

    fireEvent.mouseDown(container, { clientX: 200 });
    fireEvent.mouseLeave(container);
    fireEvent.mouseMove(container, { clientX: 100 });

    expect(container.scrollLeft).toBe(0);
  });
});

describe("FetchCarousel – touch interaction", () => {
  test("touchstart + touchmove updates scrollLeft", () => {
    render(<FetchCarousel />);
    const container = screen.getByTestId(
      "fetch-carousel-container",
    ) as HTMLElement;
    container.scrollLeft = 100;

    fireEvent.touchStart(container, { touches: [{ clientX: 200 }] });
    fireEvent.touchMove(container, { touches: [{ clientX: 150 }] });

    expect(container.scrollLeft).toBe(150);
  });

  test("stops dragging on touchend", () => {
    render(<FetchCarousel />);
    const container = screen.getByTestId(
      "fetch-carousel-container",
    ) as HTMLElement;

    fireEvent.touchStart(container, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(container);
    fireEvent.touchMove(container, { touches: [{ clientX: 100 }] });

    expect(container.scrollLeft).toBe(0);
  });
});

describe("FetchCarousel – props forwarded to hook", () => {
  test("passes totalItems and itemWidth to useInfiniteCarousel", () => {
    render(<FetchCarousel totalItems={50} width={200} />);
    expect(mockUseInfiniteCarousel).toHaveBeenCalledWith(
      expect.objectContaining({ totalItems: 50, itemWidth: 200 }),
    );
  });

  test("uses default props when none are provided", () => {
    render(<FetchCarousel />);
    expect(mockUseInfiniteCarousel).toHaveBeenCalledWith(
      expect.objectContaining({ totalItems: 100, itemWidth: 150 }),
    );
  });
});
