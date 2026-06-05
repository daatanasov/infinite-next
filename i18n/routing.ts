import { defineRouting } from "next-intl/routing";

export const defaultLocale = "en" as const;
// A list of all locales that are supported
export const locales = ["en", "bg"] as const; // Add more languages here in future

export const routing = defineRouting({
  //
  locales: locales,
  // Used when no locale matches
  defaultLocale: defaultLocale,
  //For not using prefix for the default locale in our case en
  //Possible options are - always, as-needed, never
  //https://next-intl.dev/docs/routing/configuration
  localePrefix: "as-needed",
});

export type localesTypes = (typeof locales)[number];
