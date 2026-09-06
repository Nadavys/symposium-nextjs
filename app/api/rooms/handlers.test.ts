import { describe, it, expect, vi } from "vitest";
import { handleAsk, handleGet, handleList } from "./handlers";
import { RoomNotFoundError } from "../../../lib/roomRepo";

const deps = () => ({
  tryAcquireAndAsk: vi.fn().mockResolvedValue({ ok: true }),
  getSince: vi.fn().mockResolvedValue({ status: "debating", latestIndex: 1, messages: [{ index: 1 }] }),
  startRound: vi.fn(),                              // stands in for after(() => runRound(...))
  listRooms: vi.fn().mockResolvedValue([{ id: "r1", name: "Room", status: "idle", latestIndex: 0 }]),
});

describe("api handlers", () => {
  it("POST ask: on lock win, starts the round and returns 202", async () => {
    const d = deps();
    const res = await handleAsk(d as any, "room1", { userId: "u1", authorName: "A", content: "Q?" });
    expect(res.status).toBe(202);
    expect(d.startRound).toHaveBeenCalledOnce();
  });

  it("POST ask: on lock loss, returns 409 and does NOT start a round", async () => {
    const d = deps();
    d.tryAcquireAndAsk.mockResolvedValue({ ok: false, reason: "locked" });
    const res = await handleAsk(d as any, "room1", { userId: "u2", authorName: "B", content: "Q?" });
    expect(res.status).toBe(409);
    expect(d.startRound).not.toHaveBeenCalled();
  });

  it("POST ask: on a nonexistent room, returns 404 (not a misleading 409)", async () => {
    const d = deps();
    d.tryAcquireAndAsk.mockResolvedValue({ ok: false, reason: "not_found" });
    const res = await handleAsk(d as any, "does-not-exist", { userId: "u2", authorName: "B", content: "Q?" });
    expect(res.status).toBe(404);
    expect(d.startRound).not.toHaveBeenCalled();
  });

  it("GET on a nonexistent room returns 404 instead of propagating the throw", async () => {
    const d = deps();
    d.getSince.mockRejectedValue(new RoomNotFoundError("does-not-exist"));
    const res = await handleGet(d as any, "does-not-exist", 0);
    expect(res.status).toBe(404);
  });

  it("GET returns the since-delta and current status", async () => {
    const d = deps();
    const res = await handleGet(d as any, "room1", 0);
    expect(res.status).toBe(200);
    expect(res.body.messages.map((m: any) => m.index)).toEqual([1]);
    expect(res.body.status).toBe("debating");
  });

  it("GET list returns rooms wrapped in a `rooms` array", async () => {
    const d = deps();
    const res = await handleList(d as any, 10);
    expect(res.status).toBe(200);
    expect(d.listRooms).toHaveBeenCalledWith(10);
    expect(res.body.rooms).toEqual([{ id: "r1", name: "Room", status: "idle", latestIndex: 0 }]);
  });
});
