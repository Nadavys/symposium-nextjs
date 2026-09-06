import { NextResponse, type NextRequest } from "next/server";

export const COOKIE_NAME = "symposium_auth";

const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

// MVP demo gate: one shared passcode for a handful of people, not real auth.
// The cookie's value IS the passcode — good enough to keep casual visitors
// out, not meant to resist a determined attacker.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const expected = process.env.SITE_PASSCODE;
  const authed = Boolean(expected) && request.cookies.get(COOKIE_NAME)?.value === expected;
  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|portraits).*)"],
};
