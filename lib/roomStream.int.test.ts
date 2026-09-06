import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient, Db } from "mongodb";
import { createRoom, appendTurn, tryAcquireAndAsk } from "./roomRepo";
import { watchRoom } from "./roomStream";

// Change streams require a real replica set (even a 1-node one) — a plain
// MongoMemoryServer has no oplog, so watch() would hang/error against it.
let replSet: MongoMemoryReplSet, client: MongoClient, db: Db;
beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  client = await new MongoClient(replSet.getUri()).connect();
  db = client.db("test");
}, 60_000);
afterAll(async () => { await client.close(); await replSet.stop(); }, 30_000);

function waitForChange(events: unknown[], count: number, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (events.length >= count) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("timed out waiting for change event"));
      setTimeout(check, 25);
    };
    check();
  });
}

describe("watchRoom (change streams)", () => {
  it("pushes a fresh snapshot whenever the room document is written", async () => {
    const id = await createRoom(db);
    const snapshots: any[] = [];
    const changeStream = watchRoom(db, id, (snap) => snapshots.push(snap));
    await new Promise((r) => setTimeout(r, 300));       // let the cursor actually start listening

    await tryAcquireAndAsk(db, id, { userId: "u1", authorName: "A", content: "Q?" });
    await waitForChange(snapshots, 1);
    expect(snapshots[0].status).toBe("debating");
    expect(snapshots[0].messages).toHaveLength(1);

    await appendTurn(db, id, { speakerId: "nietzsche", authorName: "Nietzsche", content: "..." });
    await waitForChange(snapshots, 2);
    expect(snapshots[1].messages).toHaveLength(2);
    expect(snapshots[1].messages[1].authorName).toBe("Nietzsche");

    await changeStream.close();
  }, 15_000);

  it("stops delivering events once the cursor is closed", async () => {
    const id = await createRoom(db);
    const snapshots: any[] = [];
    const changeStream = watchRoom(db, id, (snap) => snapshots.push(snap));
    await new Promise((r) => setTimeout(r, 300));       // let the cursor actually start listening

    await tryAcquireAndAsk(db, id, { userId: "u1", authorName: "A", content: "Q?" });
    await waitForChange(snapshots, 1);
    await changeStream.close();

    await appendTurn(db, id, { speakerId: "marx", authorName: "Marx", content: "..." });
    await new Promise((r) => setTimeout(r, 200));       // give a stray event a chance to arrive
    expect(snapshots).toHaveLength(1);                  // the post-close write never showed up
  }, 15_000);
});
