import { beforeEach, describe, expect, test, vi } from "vitest";
import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LanguageSwitcher from "@/app/_components/LanguageSwitcher";

const mockReplace = vi.fn();

vi.mock("@/i18n/navigations", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next-intl", () => ({
  useLocale: vi.fn(() => "en"),
}));

vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["en", "bg"] },
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");
  return {
    ...actual,
    useTransition: () => [false, (cb: () => void) => cb()],
  };
});

import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigations";

beforeEach(() => {
  mockReplace.mockReset();
  vi.mocked(useLocale).mockReturnValue("en");
  vi.mocked(usePathname).mockReturnValue("/");
});

describe("LanguageSwitcher – rendering", () => {
  test("renders the wrapper with data-testid", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  test("renders a button for each locale", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByTestId("locale-btn-en")).toBeInTheDocument();
    expect(screen.getByTestId("locale-btn-bg")).toBeInTheDocument();
  });

  test("displays locale labels in uppercase", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByTestId("locale-btn-en")).toHaveTextContent("EN");
    expect(screen.getByTestId("locale-btn-bg")).toHaveTextContent("BG");
  });
});

describe("LanguageSwitcher – active state", () => {
  test("active locale button has highlight class", () => {
    vi.mocked(useLocale).mockReturnValue("en");
    render(<LanguageSwitcher />);
    expect(screen.getByTestId("locale-btn-en").className).toMatch(
      /bg-indigo-100/,
    );
  });

  test("inactive locale button does not have highlight class", () => {
    vi.mocked(useLocale).mockReturnValue("en");
    render(<LanguageSwitcher />);
    expect(screen.getByTestId("locale-btn-bg").className).not.toMatch(
      /bg-indigo-100/,
    );
  });

  test("switches active styling when locale is bg", () => {
    vi.mocked(useLocale).mockReturnValue("bg");
    render(<LanguageSwitcher />);
    expect(screen.getByTestId("locale-btn-bg").className).toMatch(
      /bg-indigo-100/,
    );
    expect(screen.getByTestId("locale-btn-en").className).not.toMatch(
      /bg-indigo-100/,
    );
  });
});

describe("LanguageSwitcher – locale switching", () => {
  test("calls router.replace with correct locale when bg is clicked", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("locale-btn-bg"));
    expect(mockReplace).toHaveBeenCalledWith("/", { locale: "bg" });
  });

  test("calls router.replace with correct locale when en is clicked", () => {
    vi.mocked(useLocale).mockReturnValue("bg");
    vi.mocked(usePathname).mockReturnValue("/");
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("locale-btn-en"));
    expect(mockReplace).toHaveBeenCalledWith("/", { locale: "en" });
  });

  test("strips locale prefix from pathname before passing to router", () => {
    vi.mocked(useLocale).mockReturnValue("en");
    vi.mocked(usePathname).mockReturnValue("/en/about");
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("locale-btn-bg"));
    expect(mockReplace).toHaveBeenCalledWith("/about", { locale: "bg" });
  });

  test("falls back to '/' when stripping locale leaves empty string", () => {
    vi.mocked(useLocale).mockReturnValue("en");
    vi.mocked(usePathname).mockReturnValue("/en");
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("locale-btn-bg"));
    expect(mockReplace).toHaveBeenCalledWith("/", { locale: "bg" });
  });

  test("does not call router.replace when clicking the already-active locale", () => {
    vi.mocked(useLocale).mockReturnValue("en");
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId("locale-btn-en"));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});

describe("LanguageSwitcher – pending state", () => {
  test("buttons are enabled when not pending", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByTestId("locale-btn-en")).not.toBeDisabled();
    expect(screen.getByTestId("locale-btn-bg")).not.toBeDisabled();
  });

  test("buttons are disabled while transition is pending", async () => {
    const { useTransition: _original, ...rest } =
      await vi.importActual<typeof React>("react");
    vi.spyOn(React, "useTransition").mockReturnValueOnce([true, vi.fn()]);

    render(<LanguageSwitcher />);
    expect(screen.getByTestId("locale-btn-en")).toBeDisabled();
    expect(screen.getByTestId("locale-btn-bg")).toBeDisabled();
  });
});
