import { describe, it, expect } from "vitest";
import { canAsk, acquire, release } from "./lock";

describe("input lock (multi-user concurrency)", () => {
  it("anyone can ask while idle; nobody while debating", () => {
    expect(canAsk("idle")).toBe(true);
    expect(canAsk("debating")).toBe(false);
  });
  it("acquiring from idle wins the slot and flips to debating", () => {
    expect(acquire("idle")).toEqual({ ok: true, next: "debating" });
  });
  it("acquiring while a round is in flight is rejected, status unchanged", () => {
    expect(acquire("debating")).toEqual({ ok: false, next: "debating" });
  });
  it("two people racing for the next slot: exactly one wins", () => {
    let status = "idle" as const as ReturnType<typeof release>;
    const first = acquire(status); status = first.next;
    const second = acquire(status);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });
  it("release returns the room to idle", () => {
    expect(release()).toBe("idle");
  });
});
