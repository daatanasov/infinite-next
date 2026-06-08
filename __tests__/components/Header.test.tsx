import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import Header from "@/app/_components/Header";
import { usePathname } from "@/i18n/navigations";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      home: "Home",
      static: "Static Carousel",
      infinite: "Infinite Carousel",
      fetch: "Fetch Carousel",
    };
    return translations[key] ?? key;
  },
}));

vi.mock("@/i18n/navigations", () => ({
  Link: ({
    href,
    children,
    className,
    onClick,
    "data-testid": testId,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    "data-testid"?: string;
  }) => (
    <a href={href} className={className} onClick={onClick} data-testid={testId}>
      {children}
    </a>
  ),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@/app/_components/LanguageSwitcher", () => ({
  default: () => <div data-testid="language-switcher">🌐</div>,
}));

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/");
});

describe("Header – desktop", () => {
  test("renders logo link to home", () => {
    render(<Header />);
    const logo = screen.getByTestId("header-logo-link");
    expect(logo).toHaveAttribute("href", "/");
  });

  test("renders all navigation links with correct hrefs", () => {
    render(<Header />);
    expect(screen.getByTestId("header-nav-link-home")).toHaveTextContent(
      "Home",
    );
    expect(screen.getByTestId("header-nav-link-static")).toHaveTextContent(
      "Static Carousel",
    );
    expect(screen.getByTestId("header-nav-link-infinite")).toHaveTextContent(
      "Infinite Carousel",
    );
    expect(screen.getByTestId("header-nav-link-fetch")).toHaveTextContent(
      "Fetch Carousel",
    );
  });

  test("active link gets highlighted class", () => {
    vi.mocked(usePathname).mockReturnValue("/static-carousel");
    render(<Header />);
    expect(screen.getByTestId("header-nav-link-static").className).toMatch(
      /text-indigo-600/,
    );
  });

  test("renders language switcher", () => {
    render(<Header />);
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });
});

describe("Header – mobile menu", () => {
  test("toggles mobile menu on button click", () => {
    render(<Header />);
    const toggleButton = screen.getByTestId("button-mobile-navigation");
    expect(
      screen.queryByTestId("header-nav-mobile-link-static"),
    ).not.toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(
      screen.getByTestId("header-nav-mobile-link-static"),
    ).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(
      screen.queryByTestId("header-nav-mobile-link-static"),
    ).not.toBeInTheDocument();
  });

  test("closes mobile menu when a link is clicked", () => {
    render(<Header />);
    const toggleButton = screen.getByTestId("button-mobile-navigation");
    fireEvent.click(toggleButton);
    const mobileLink = screen.getByTestId("header-nav-mobile-link-static");
    fireEvent.click(mobileLink);
    expect(
      screen.queryByTestId("header-nav-mobile-link-static"),
    ).not.toBeInTheDocument();
  });

  test("language switcher appears in mobile menu", () => {
    render(<Header />);
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });
});
