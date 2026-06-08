import { beforeEach, test, expect, vi, describe } from "vitest";
import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InfiniteCarousel from "@/app/_components/InfiniteCarousel";

vi.mock("@/app/_components/CarouselCard", () => ({
  default: ({
    image,
    cardWidth,
    height,
  }: {
    image: unknown;
    cardWidth: number;
    height: number;
  }) => (
    <div
      data-testid="carousel-card"
      data-width={cardWidth}
      data-height={height}>
      card-{String(image)}
    </div>
  ),
}));

vi.mock("@/app/_components/Skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock("@/app/_components/ErrorBanner", () => ({
  ErrorBanner: ({
    message,
    onDismiss,
  }: {
    message: string;
    onDismiss: () => void;
  }) => (
    <div data-testid="error-banner">
      <span>{message}</span>
      <button onClick={onDismiss}>dismiss</button>
    </div>
  ),
}));

const mockOnScroll = vi.fn();
const mockClearError = vi.fn();

const defaultCircularCarousel: {
  items: string[];
  windowItems: number;
  onScroll: ReturnType<typeof vi.fn>;
  initialScrollLeft: number;
  isLoadingBackward: boolean;
  isLoadingForward: boolean;
  error: string | null;
  clearError: ReturnType<typeof vi.fn>;
} = {
  items: Array.from({ length: 20 }, (_, i) => `item-${i}`),
  windowItems: 20,
  onScroll: mockOnScroll,
  initialScrollLeft: 0,
  isLoadingBackward: false,
  isLoadingForward: false,
  error: null,
  clearError: mockClearError,
};

const mockUseCircularCarousel = vi.fn(
  (
    ...args: [
      number,
      React.RefObject<HTMLDivElement | null>,
      config: { totalItems: number; pageSize: number },
    ]
  ) => defaultCircularCarousel,
);
vi.mock("@/app/_hooks/useCircularCarousel", () => ({
  useCircularCarousel: (
    ...args: [
      number,
      React.RefObject<HTMLDivElement | null>,
      config: { totalItems: number; pageSize: number },
    ]
  ) => mockUseCircularCarousel(...args),
}));

const mockIsDragging = { current: false };
const mockDragHandlers = {
  onMouseDown: vi.fn(),
  onMouseMove: vi.fn(),
  onMouseUp: vi.fn(),
};

vi.mock("@/app/_hooks/useDragScroll", () => ({
  useDragScroll: () => ({
    isDragging: mockIsDragging,
    ...mockDragHandlers,
  }),
}));

vi.mock("@/app/_hooks/useAutoPlay", () => ({
  useAutoPlay: vi.fn(),
}));

const buildVirtualItems = (count: number, itemSize: number) =>
  Array.from({ length: count }, (_, i) => ({
    key: i,
    index: i,
    start: i * itemSize,
    size: itemSize,
  }));

const mockGetVirtualItems = vi.fn(() => buildVirtualItems(5, 164));
const mockGetTotalSize = vi.fn(() => 3280);

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getVirtualItems: mockGetVirtualItems,
    getTotalSize: mockGetTotalSize,
    measureElement: vi.fn(),
  }),
}));

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
    scrollWidth: {
      configurable: true,
      get: () => Number.MAX_SAFE_INTEGER,
    },
  });

  mockOnScroll.mockReset();
  mockClearError.mockReset();
  mockUseCircularCarousel.mockReturnValue({ ...defaultCircularCarousel });
  mockGetVirtualItems.mockReturnValue(buildVirtualItems(5, 164));
  mockGetTotalSize.mockReturnValue(3280);
});

describe("InfiniteCarousel – rendering", () => {
  test("renders the scroll container with correct ARIA attributes", () => {
    render(<InfiniteCarousel />);

    const container = screen.getByTestId("infinite-carousel-container");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("scroll-container");
    expect(container).toHaveAttribute("tabindex", "0");
  });

  test("renders CarouselCard for each virtual item that has data", () => {
    render(<InfiniteCarousel />);
    expect(screen.getAllByTestId("carousel-card")).toHaveLength(5);
  });

  test("renders Skeleton when item slot is null/undefined", () => {
    mockUseCircularCarousel.mockReturnValue({
      ...defaultCircularCarousel,
      items: ["item-0", "item-1"],
      windowItems: 5,
    });

    render(<InfiniteCarousel />);

    expect(screen.getAllByTestId("carousel-card")).toHaveLength(2);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(3);
  });

  test("applies correct height style to scroll container", () => {
    render(<InfiniteCarousel height={320} />);

    const container = screen.getByTestId("infinite-carousel-container");
    expect(container).toHaveStyle({ height: "320px" });
  });

  test("track div gets total width from virtualizer", () => {
    mockGetTotalSize.mockReturnValue(9999);
    render(<InfiniteCarousel />);
    const track = screen.getByTestId("infinite-carousel-track") as HTMLElement;
    expect(track).toHaveStyle({ width: "9999px" });
  });
});

describe("InfiniteCarousel – loading indicators", () => {
  test("does not show edge indicators when not loading", () => {
    render(<InfiniteCarousel />);
    const loadingBackward = screen.queryByTestId("loading-backward-indicator");
    const isLoadingForward = screen.queryByTestId("loading-forward-indicator");
    expect(loadingBackward).not.toBeInTheDocument();
    expect(isLoadingForward).not.toBeInTheDocument();
  });

  test("shows left edge indicator when isLoadingBackward is true", () => {
    mockUseCircularCarousel.mockReturnValue({
      ...defaultCircularCarousel,
      isLoadingBackward: true,
    });

    render(<InfiniteCarousel />);
    const loadingBackward = screen.queryByTestId("loading-backward-indicator");
    const isLoadingForward = screen.queryByTestId("loading-forward-indicator");
    expect(loadingBackward).toBeInTheDocument();
    expect(isLoadingForward).not.toBeInTheDocument();
  });

  test("shows right edge indicator when isLoadingForward is true", () => {
    mockUseCircularCarousel.mockReturnValue({
      ...defaultCircularCarousel,
      isLoadingForward: true,
    });

    render(<InfiniteCarousel />);
    const loadingBackward = screen.queryByTestId("loading-backward-indicator");
    const isLoadingForward = screen.queryByTestId("loading-forward-indicator");
    expect(isLoadingForward).toBeInTheDocument();
    expect(loadingBackward).not.toBeInTheDocument();
  });
});

describe("InfiniteCarousel – error banner", () => {
  test("does not render ErrorBanner when error is null", () => {
    render(<InfiniteCarousel />);
    expect(screen.queryByTestId("error-banner")).not.toBeInTheDocument();
  });

  test("renders ErrorBanner with the error message", () => {
    mockUseCircularCarousel.mockReturnValue({
      ...defaultCircularCarousel,
      error: "Failed to load images",
    });

    render(<InfiniteCarousel />);

    expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    expect(screen.getByText("Failed to load images")).toBeInTheDocument();
  });

  test("calls clearError when ErrorBanner dismiss button is clicked", () => {
    mockUseCircularCarousel.mockReturnValue({
      ...defaultCircularCarousel,
      error: "Network error",
    });

    render(<InfiniteCarousel />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(mockClearError).toHaveBeenCalledTimes(1);
  });
});

describe("InfiniteCarousel – scroll & wheel events", () => {
  test("calls onScroll when the container fires a scroll event", () => {
    render(<InfiniteCarousel />);

    const container = screen.getByTestId("infinite-carousel-container");
    fireEvent.scroll(container);

    expect(mockOnScroll).toHaveBeenCalledTimes(1);
  });

  test("calls onScroll when the wheel event fires", () => {
    render(<InfiniteCarousel />);

    const container = screen.getByTestId("infinite-carousel-container");
    fireEvent.wheel(container, { deltaY: 0, deltaX: 100 });

    expect(mockOnScroll).toHaveBeenCalledTimes(1);
  });

  test("adjusts scrollLeft by deltaY + deltaX on wheel", () => {
    render(<InfiniteCarousel />);

    const container = screen.getByTestId(
      "infinite-carousel-container",
    ) as HTMLElement;
    fireEvent.wheel(container, { deltaY: 0, deltaX: 100 });

    expect(container.scrollLeft).toBe(100);
  });
});

describe("InfiniteCarousel – hover state", () => {
  test("sets isHovering ref on mouseenter and resets on mouseleave", () => {
    render(<InfiniteCarousel />);

    const container = screen.getByTestId("infinite-carousel-container");
    expect(() => {
      fireEvent.mouseEnter(container);
      fireEvent.mouseLeave(container);
    }).not.toThrow();
  });
});

describe("InfiniteCarousel – props forwarded correctly", () => {
  test("passes width and height to CarouselCard", () => {
    render(<InfiniteCarousel width={200} height={300} />);

    const cards = screen.getAllByTestId("carousel-card");
    cards.forEach((card) => {
      expect(card).toHaveAttribute("data-width", "200");
      expect(card).toHaveAttribute("data-height", "300");
    });
  });

  test("passes totalItems and pageSize to useCircularCarousel", () => {
    render(<InfiniteCarousel totalItems={50} pageSize={10} />);

    expect(mockUseCircularCarousel).toHaveBeenCalledWith(
      expect.any(Number),
      expect.anything(),
      { totalItems: 50, pageSize: 10 },
    );
  });

  test("itemSize passed to useCircularCarousel is width + gap", () => {
    render(<InfiniteCarousel width={120} gap={20} />);

    const lastCall = mockUseCircularCarousel.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const [itemSizeArg] = lastCall!;
    expect(itemSizeArg).toBe(140);
  });
});
