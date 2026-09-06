import type { Db } from "mongodb";
import type { WindowState } from "./rateLimit";

// Same fixed-window semantics as lib/rateLimit.ts's nextWindowState, reimplemented
// as a single atomic update so concurrent requests for the same key can't both
// read a stale count and both slip through (same pattern as roomRepo's lock).
export async function bumpRateLimit(db: Db, key: string, windowMs: number): Promise<WindowState> {
  const now = Date.now();
  // $ifNull (not $eq null) to detect "never set": in the aggregation framework a
  // missing field is NOT $eq null, so that check silently never fires and
  // windowStart is $set to a reference to itself — i.e. never actually written.
  const priorWindowStart = { $ifNull: ["$windowStart", now - windowMs - 1] }; // missing = already expired
  const expired = { $gte: [{ $subtract: [now, priorWindowStart] }, windowMs] };
  const doc = await db.collection("rateLimits").findOneAndUpdate(
    { _id: key as any },
    [{
      $set: {
        windowStart: { $cond: [expired, now, priorWindowStart] },
        count: { $cond: [expired, 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }] },
        expiresAt: new Date(now + windowMs * 2),          // TTL cleanup, see lib/db.ts
      },
    }],
    { upsert: true, returnDocument: "after" },
  );
  return { windowStart: doc!.windowStart, count: doc!.count };
}
