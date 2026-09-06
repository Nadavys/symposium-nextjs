import { describe, it, expect } from "vitest";
import { formatSseEvent } from "./roomStream";

describe("formatSseEvent", () => {
  it("formats a bare message event with no `event:` line", () => {
    expect(formatSseEvent({ status: "idle" })).toBe('data: {"status":"idle"}\n\n');
  });

  it("adds an `event:` line for a named event", () => {
    expect(formatSseEvent({}, "not_found")).toBe("event: not_found\ndata: {}\n\n");
  });
});
