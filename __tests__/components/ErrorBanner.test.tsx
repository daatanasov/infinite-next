import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ErrorBanner } from "@/app/_components/ErrorBanner";

describe("ErrorBanner", () => {
  test("renders with role alert and aria-live assertive", () => {
    render(<ErrorBanner message="Something went wrong" onDismiss={vi.fn()} />);
    const banner = screen.getByTestId("error-banner-container");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("aria-live", "assertive");
  });

  test("displays the message", () => {
    render(<ErrorBanner message="Network error" onDismiss={vi.fn()} />);
    const banner = screen.getByTestId("error-banner-message");
    expect(banner).toHaveTextContent("Network error");
    expect(banner).toBeInTheDocument();
  });

  test("calls onDismiss when dismiss button is clicked", () => {
    const onDismiss = vi.fn();
    render(<ErrorBanner message="Test" onDismiss={onDismiss} />);
    const dismissButton = screen.getByTestId("error-banner-dismiss-button");
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("dismiss button has accessible label", () => {
    render(<ErrorBanner message="Test" onDismiss={vi.fn()} />);
    const dismissButton = screen.getByTestId("error-banner-dismiss-button");
    expect(dismissButton).toHaveAttribute("aria-label", "Dismiss error");
  });
});
