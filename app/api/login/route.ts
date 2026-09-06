export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "../../../proxy";

export async function POST(request: NextRequest) {
  const expected = process.env.SITE_PASSCODE;
  if (!expected) {
    return NextResponse.json({ error: "SITE_PASSCODE is not set" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { passcode } = (body ?? {}) as Record<string, unknown>;
  if (passcode !== expected) {
    return NextResponse.json({ error: "wrong passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days — a demo shared with a few people, not a security boundary
  });
  return res;
}
