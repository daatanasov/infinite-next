"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigations";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const rawPathname = usePathname(); // e.g. "/bg/about" or "/about"
  const [isPending, startTransition] = useTransition();

  // Strip the locale prefix so next-intl doesn't double it up
  const pathname = rawPathname.replace(`/${locale}`, "") || "/";

  const switchLocale = (nextLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      {routing.locales.map((loc) => (
        <button
          type="button"
          key={loc}
          onClick={() => switchLocale(loc)}
          disabled={isPending}
          className={`px-2 py-1 rounded-md font-medium transition-colors ${
            locale === loc
              ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}>
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
