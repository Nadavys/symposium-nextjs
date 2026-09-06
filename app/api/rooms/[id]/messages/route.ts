export const runtime = "nodejs";

import { NextRequest, NextResponse, after } from "next/server";
import { getDb } from "../../../../../lib/db";
import { tryAcquireAndAsk } from "../../../../../lib/roomRepo";
import { runFullRound } from "../../../../../lib/liveRound";
import { enforceRateLimit } from "../../../../../lib/requestRateLimit";
import { validateAskRequest } from "../../../../../lib/askRequest";
import { handleAsk } from "../../handlers";

const ASK_LIMIT_PER_HOUR = 40;               // 4 model calls per ask, so this caps real spend per visitor

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await getDb();

  // Rate-limit before touching the body, so a client spamming malformed
  // JSON/invalid fields still gets throttled instead of failing for free.
  const limited = await enforceRateLimit(db, request, "ask", ASK_LIMIT_PER_HOUR);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const q = validateAskRequest(body);
  if (!q) {
    return NextResponse.json(
      { error: "userId, authorName, and content are required non-empty strings" },
      { status: 400 },
    );
  }

  const deps = {
    tryAcquireAndAsk: (roomId: string, question: typeof q) => tryAcquireAndAsk(db, roomId, question),
    startRound: (roomId: string) => {
      after(() => runFullRound(roomId));                    // non-blocking; POST returns immediately
    },
  };
  const res = await handleAsk(deps, id, q);
  return NextResponse.json(res.body, { status: res.status });
}
