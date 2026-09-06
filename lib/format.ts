export function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function timeAgo(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const n = Math.floor(diff / MINUTE);
    return `${n} minute${n === 1 ? "" : "s"} ago`;
  }
  if (diff < DAY) {
    const n = Math.floor(diff / HOUR);
    return `${n} hour${n === 1 ? "" : "s"} ago`;
  }
  if (diff < WEEK) {
    const n = Math.floor(diff / DAY);
    return n === 1 ? "yesterday" : `${n} days ago`;
  }
  const n = Math.floor(diff / WEEK);
  return n === 1 ? "last week" : `${n} weeks ago`;
}

// Turns a 429 response's `Retry-After` header (seconds, or absent) into a
// human-readable suffix, so "too many requests" errors tell you when to retry
// instead of just "wait a bit".
export function retryAfterSuffix(retryAfterHeader: string | null): string {
  const s = Number(retryAfterHeader);
  if (!retryAfterHeader || !Number.isFinite(s) || s <= 0) return "";
  return ` — try again in ${s}s`;
}
