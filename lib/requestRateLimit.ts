import type { Db } from "mongodb";
import { NextResponse, type NextRequest } from "next/server";
import { ipAddress } from "@vercel/functions";
import { bumpRateLimit } from "./rateLimitRepo";
import { isAllowed, retryAfterMs } from "./rateLimit";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Cost control: each "ask" triggers 4 model calls, so this caps real spend per
// visitor rather than just request volume. Keyed by best-effort client IP —
// ipAddress() reads Vercel's forwarded headers and returns undefined locally,
// so every local-dev request shares one "unknown" bucket per action.
export async function checkRateLimit(
  db: Db,
  request: NextRequest,
  action: "create" | "ask" | "stream",
  limit: number,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const ip = ipAddress(request) ?? "unknown";
  const state = await bumpRateLimit(db, `${action}:${ip}`, WINDOW_MS);
  if (isAllowed(state, limit)) return { ok: true, retryAfterSec: 0 };
  return { ok: false, retryAfterSec: Math.ceil(retryAfterMs(state, WINDOW_MS, Date.now()) / 1000) };
}

// For plain JSON routes (create/ask): a 429 response, or null to proceed.
export async function enforceRateLimit(
  db: Db,
  request: NextRequest,
  action: "create" | "ask" | "stream",
  limit: number,
): Promise<NextResponse | null> {
  const { ok, retryAfterSec } = await checkRateLimit(db, request, action, limit);
  if (ok) return null;
  return NextResponse.json(
    { error: "too many requests, try again later", retryAfterSec },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}
