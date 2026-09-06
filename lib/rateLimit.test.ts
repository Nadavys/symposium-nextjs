import { describe, it, expect } from "vitest";
import { nextWindowState, isAllowed, retryAfterMs, type WindowState } from "./rateLimit";

describe("fixed-window rate limit (pure logic)", () => {
  it("a first request with no prior state starts a fresh window of 1", () => {
    expect(nextWindowState(null, 1000, 60_000)).toEqual({ windowStart: 1000, count: 1 });
  });
  it("a request inside the window bumps the count without moving windowStart", () => {
    const prev: WindowState = { windowStart: 1000, count: 3 };
    expect(nextWindowState(prev, 1500, 60_000)).toEqual({ windowStart: 1000, count: 4 });
  });
  it("a request after the window has elapsed resets to a fresh window", () => {
    const prev: WindowState = { windowStart: 1000, count: 10 };
    expect(nextWindowState(prev, 1000 + 60_000, 60_000)).toEqual({ windowStart: 61_000, count: 1 });
  });
  it("allows up to and including the limit, rejects past it", () => {
    expect(isAllowed({ windowStart: 0, count: 5 }, 5)).toBe(true);
    expect(isAllowed({ windowStart: 0, count: 6 }, 5)).toBe(false);
  });
  it("reports how long until the window resets", () => {
    expect(retryAfterMs({ windowStart: 1000, count: 6 }, 60_000, 1500)).toBe(60_000 - 500);
    expect(retryAfterMs({ windowStart: 1000, count: 6 }, 60_000, 999_999)).toBe(0);
  });
});
