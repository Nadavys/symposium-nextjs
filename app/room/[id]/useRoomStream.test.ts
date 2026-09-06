import { describe, it, expect } from "vitest";
import { applyStreamResponse, type RoomStreamState } from "./useRoomStream";
import type { Message } from "../../../lib/messages";

const m = (index: number): Message => ({
  index, role: "philosopher", speakerId: "marx", authorName: "Marx", content: `t${index}`, createdAt: 0,
});

const initial: RoomStreamState = {
  name: null, status: "idle", lastIndex: -1, messages: [], notFound: false, connected: false, rateLimited: false,
};

describe("applyStreamResponse (stream reducer)", () => {
  it("merges incoming messages and advances the cursor to the new latest index", () => {
    const next = applyStreamResponse(initial, { name: "Room", status: "debating", latestIndex: 1, messages: [m(0), m(1)] });
    expect(next.messages.map((x) => x.index)).toEqual([0, 1]);
    expect(next.lastIndex).toBe(1);
    expect(next.status).toBe("debating");
    expect(next.name).toBe("Room");
  });

  it("a duplicate snapshot never doubles a message", () => {
    const first = applyStreamResponse(initial, { name: "Room", status: "debating", latestIndex: 0, messages: [m(0)] });
    const second = applyStreamResponse(first, { name: "Room", status: "debating", latestIndex: 0, messages: [m(0)] });
    expect(second.messages).toHaveLength(1);
  });

  it("keeps the prior name when a later delta carries none", () => {
    const withName = applyStreamResponse(initial, { name: "Room", status: "idle", latestIndex: -1, messages: [] });
    const next = applyStreamResponse(withName, { name: null, status: "idle", latestIndex: -1, messages: [] });
    expect(next.name).toBe("Room");
  });

  it("carries the status through unchanged so the caller can drive the input lock", () => {
    const debating = applyStreamResponse(initial, { name: null, status: "debating", latestIndex: -1, messages: [] });
    const idle = applyStreamResponse(initial, { name: null, status: "idle", latestIndex: -1, messages: [] });
    expect(debating.status).toBe("debating");
    expect(idle.status).toBe("idle");
  });

  it("clears a stale notFound flag once a real delta arrives", () => {
    const notFound = { ...initial, notFound: true };
    const next = applyStreamResponse(notFound, { name: "Room", status: "idle", latestIndex: -1, messages: [] });
    expect(next.notFound).toBe(false);
  });

  it("marks the state connected once the first event arrives", () => {
    expect(initial.connected).toBe(false);
    const next = applyStreamResponse(initial, { name: null, status: "idle", latestIndex: -1, messages: [] });
    expect(next.connected).toBe(true);
  });

  it("clears a stale rateLimited flag once a real delta arrives", () => {
    const limited = { ...initial, rateLimited: true };
    const next = applyStreamResponse(limited, { name: null, status: "idle", latestIndex: -1, messages: [] });
    expect(next.rateLimited).toBe(false);
  });
});
