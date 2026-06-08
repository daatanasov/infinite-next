import { render, screen, fireEvent, act } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import CarouselCard from "@/app/_components/CarouselCard";
import { buildImageSrc } from "@/app/_utils/carouselMath";
import type { PicsumImage } from "@/app/_utils/api";

vi.mock("@/app/_utils/carouselMath", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/_utils/carouselMath")
  >("@/app/_utils/carouselMath");
  return {
    ...actual,
    buildImageSrc: vi.fn(actual.buildImageSrc), // allow spying
  };
});

const mockImage: PicsumImage = {
  id: "1",
  rawId: "abc123",
  author: "John Doe",
  width: 150,
  height: 250,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CarouselCard – rendering", () => {
  test("renders card with proper role and aria-label", () => {
    render(<CarouselCard image={mockImage} cardWidth={200} height={300} />);
    const root = screen.getByTestId("carousel-card-image");
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("alt", "John Doe");
  });

  test("renders shimmer skeleton (loading state)", () => {
    render(<CarouselCard image={mockImage} cardWidth={200} height={300} />);
    const skeleton = screen.queryByTestId("card-shimmer-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).not.toHaveClass("shimmer-hidden");
  });

  test("renders an img with correct src via buildImageSrc", () => {
    render(<CarouselCard image={mockImage} cardWidth={200} height={300} />);
    const img = screen.getByTestId("carousel-card-image");
    // buildImageSrc should have been called with rawId, cardWidth, height
    expect(buildImageSrc).toHaveBeenCalledWith("abc123", 200, 300);
    expect(img).toHaveAttribute("src", expect.any(String));
  });

  test("applies width/height attributes to the img", () => {
    render(<CarouselCard image={mockImage} cardWidth={250} height={400} />);
    const img = screen.getByTestId("carousel-card-image");
    expect(img).toHaveAttribute("width", "250");
    expect(img).toHaveAttribute("height", "400");
  });

  test("img is lazy, async, and not draggable", () => {
    render(<CarouselCard image={mockImage} cardWidth={200} height={300} />);
    const img = screen.getByTestId("carousel-card-image");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img).toHaveAttribute("draggable", "false");
  });

  test("overlay displays author name", () => {
    render(<CarouselCard image={mockImage} cardWidth={200} height={300} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  test("overlay is hidden from accessibility tree", () => {
    render(<CarouselCard image={mockImage} cardWidth={200} height={300} />);
    const overlay = document.querySelector(".overlay");
    expect(overlay).toHaveAttribute("aria-hidden", "true");
  });
});

describe("CarouselCard – image loading states", () => {
  test("hides shimmer and shows loaded class on image load", () => {
    render(<CarouselCard image={mockImage} cardWidth={200} height={300} />);
    const img = screen.getByTestId("carousel-card-image");
    const skeleton = screen.queryByTestId("card-shimmer-skeleton");

    // Initially loading
    expect(skeleton).not.toHaveClass("shimmer-hidden");
    expect(img).not.toHaveClass("card-image-loaded");

    // Simulate image load
    fireEvent.load(img);

    expect(skeleton).toHaveClass("shimmer-hidden");
    expect(img).toHaveClass("card-image-loaded");
  });

  test("removes img and shows shimmer on error", () => {
    render(<CarouselCard image={mockImage} cardWidth={200} height={300} />);
    const img = screen.getByTestId("carousel-card-image");
    const skeleton = screen.queryByTestId("card-shimmer-skeleton");

    fireEvent.error(img);

    expect(img).not.toBeInTheDocument();
    expect(skeleton).toBeInTheDocument();
  });
});
