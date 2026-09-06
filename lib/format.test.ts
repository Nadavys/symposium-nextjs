import { describe, it, expect } from "vitest";
import { joinWithAnd, timeAgo, retryAfterSuffix } from "./format";

describe("joinWithAnd", () => {
  it("handles zero, one, and two items", () => {
    expect(joinWithAnd([])).toBe("");
    expect(joinWithAnd(["Nietzsche"])).toBe("Nietzsche");
    expect(joinWithAnd(["Nietzsche", "Marx"])).toBe("Nietzsche and Marx");
  });
  it("joins three or more with commas and a trailing 'and'", () => {
    expect(joinWithAnd(["Nietzsche", "Marx", "Beauvoir", "Foucault"])).toBe(
      "Nietzsche, Marx, Beauvoir, and Foucault",
    );
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-01-01T12:00:00Z");
  it("buckets from just now up through weeks", () => {
    expect(timeAgo(now, now)).toBe("just now");
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5 minutes ago");
    expect(timeAgo(now - 60 * 60_000, now)).toBe("1 hour ago");
    expect(timeAgo(now - 25 * 60 * 60_000, now)).toBe("yesterday");
    expect(timeAgo(now - 3 * 24 * 60 * 60_000, now)).toBe("3 days ago");
    expect(timeAgo(now - 9 * 24 * 60 * 60_000, now)).toBe("last week");
  });
});

describe("retryAfterSuffix", () => {
  it("formats a valid header, and ignores anything else", () => {
    expect(retryAfterSuffix("42")).toBe(" — try again in 42s");
    expect(retryAfterSuffix(null)).toBe("");
    expect(retryAfterSuffix("0")).toBe("");
    expect(retryAfterSuffix("-5")).toBe("");
    expect(retryAfterSuffix("not-a-number")).toBe("");
  });
});
