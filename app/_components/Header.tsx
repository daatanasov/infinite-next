"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigations";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";

const navLinks = [
  { href: "/", label: "home" },
  { href: "/static-carousel", label: "static" },
  { href: "/infinite-carousel", label: "infinite" },
  { href: "/fetch-carousel", label: "fetch" },
] as const;

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo / Brand */}
        <Link
          href="/"
          data-testid="header-logo-link"
          className="text-xl font-bold tracking-tight">
          🌀 InfiniteCarousel
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              data-testid={`header-nav-link-${label}`}
              className={`text-sm font-medium transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${
                pathname === href ? "text-indigo-600 dark:text-indigo-400" : ""
              }`}>
              {t(label)}
            </Link>
          ))}
          <LanguageSwitcher />
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          data-testid="button-mobile-navigation"
          className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <nav className="flex flex-col px-4 py-3 gap-2">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                data-testid={`header-nav-mobile-link-${label}`}
                onClick={() => setMenuOpen(false)}
                className={`text-sm font-medium py-2 px-3 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  pathname === href
                    ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                    : ""
                }`}>
                {t(label)}
              </Link>
            ))}
            <div className="pt-2">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
