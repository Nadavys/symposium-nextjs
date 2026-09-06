import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Db } from "mongodb";
import { createRoom, tryAcquireAndAsk, appendTurn, getSince, listRooms, RoomNotFoundError } from "./roomRepo";

let mongod: MongoMemoryServer, client: MongoClient, db: Db;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ binary: { version: "7.0.14" } });
  client = await new MongoClient(mongod.getUri()).connect();
  db = client.db("test");
});
afterAll(async () => { await client.close(); await mongod.stop(); });

describe("room repo (atomic)", () => {
  it("only ONE of two concurrent askers acquires the lock", async () => {
    const id = await createRoom(db);
    const [a, b] = await Promise.all([
      tryAcquireAndAsk(db, id, { userId: "u1", authorName: "A", content: "Q1?" }),
      tryAcquireAndAsk(db, id, { userId: "u2", authorName: "B", content: "Q2?" }),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);   // exactly one winner
    const room = await db.collection("rooms").findOne({ _id: id as any });
    expect(room!.status).toBe("debating");
    expect(room!.messages).toHaveLength(1);                 // only the winner's question
  });

  it("appended turns get distinct, contiguous indexes, and store the given display name", async () => {
    const id = await createRoom(db);
    await tryAcquireAndAsk(db, id, { userId: "u1", authorName: "A", content: "Q?" });
    await appendTurn(db, id, { speakerId: "nietzsche", authorName: "Nietzsche", content: "..." });
    await appendTurn(db, id, { speakerId: "marx", authorName: "Marx", content: "..." });
    const room = await db.collection("rooms").findOne({ _id: id as any });
    expect(room!.messages.map((m: any) => m.index)).toEqual([0, 1, 2]);
    expect(room!.latestIndex).toBe(2);
    expect(room!.messages[1].authorName).toBe("Nietzsche");    // not the raw speakerId
    expect(room!.messages[2].authorName).toBe("Marx");
  });

  it("getSince returns only newer messages", async () => {
    const id = await createRoom(db);
    await tryAcquireAndAsk(db, id, { userId: "u1", authorName: "A", content: "Q?" });
    await appendTurn(db, id, { speakerId: "nietzsche", authorName: "Nietzsche", content: "..." });
    const delta = await getSince(db, id, 0);
    expect(delta.messages.map((m: any) => m.index)).toEqual([1]);
  });

  it("listRooms returns summaries newest-active-first, without message bodies, capped at limit", async () => {
    const older = await createRoom(db);
    await new Promise((r) => setTimeout(r, 5));         // force distinct lastActivityAt
    const newer = await createRoom(db);
    await tryAcquireAndAsk(db, newer, { userId: "u1", authorName: "A", content: "Q?" });

    const all = await listRooms(db, 50);
    const ids = all.map((r) => r.id);
    expect(ids.indexOf(newer)).toBeLessThan(ids.indexOf(older)); // newest activity first

    const newerSummary = all.find((r) => r.id === newer)!;
    expect(newerSummary.status).toBe("debating");
    expect(newerSummary.latestIndex).toBe(0);
    expect((newerSummary as any).messages).toBeUndefined();      // projected out

    const capped = await listRooms(db, 1);
    expect(capped).toHaveLength(1);
  });

  it("tryAcquireAndAsk on a nonexistent room reports reason 'not_found', distinct from a locked room", async () => {
    const missing = await tryAcquireAndAsk(db, "does-not-exist", { userId: "u1", authorName: "A", content: "Q?" });
    expect(missing).toEqual({ ok: false, reason: "not_found" });

    const id = await createRoom(db);
    await tryAcquireAndAsk(db, id, { userId: "u1", authorName: "A", content: "Q1?" }); // now debating
    const locked = await tryAcquireAndAsk(db, id, { userId: "u2", authorName: "B", content: "Q2?" });
    expect(locked).toEqual({ ok: false, reason: "locked" });
  });

  it("getSince throws RoomNotFoundError for a nonexistent room", async () => {
    await expect(getSince(db, "does-not-exist")).rejects.toBeInstanceOf(RoomNotFoundError);
  });
});
