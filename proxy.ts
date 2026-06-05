import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API, static, etc.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/trpc") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Handle locale prefix detection
  const pathnameHasLocale = routing.locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  let pathWithoutLocale = pathname;
  if (pathnameHasLocale) {
    const segments = pathname.split("/");
    segments.splice(1, 1);
    pathWithoutLocale = segments.join("/") || "/";
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
