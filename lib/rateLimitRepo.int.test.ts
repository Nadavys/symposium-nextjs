import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Db } from "mongodb";
import { bumpRateLimit } from "./rateLimitRepo";
import { isAllowed } from "./rateLimit";

let mongod: MongoMemoryServer, client: MongoClient, db: Db;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ binary: { version: "7.0.14" } });
  client = await new MongoClient(mongod.getUri()).connect();
  db = client.db("test");
});
afterAll(async () => { await client.close(); await mongod.stop(); });

describe("rate limit repo (atomic)", () => {
  it("counts up within a window and rejects once the limit is exceeded", async () => {
    const key = "ask:1.2.3.4";
    const windowMs = 60_000;
    const limit = 3;
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      const state = await bumpRateLimit(db, key, windowMs);
      results.push(isAllowed(state, limit));
    }
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("concurrent bumps for the same key are serialized, not lost", async () => {
    const key = "ask:concurrent";
    const windowMs = 60_000;
    await Promise.all(Array.from({ length: 10 }, () => bumpRateLimit(db, key, windowMs)));
    const room = await db.collection("rateLimits").findOne({ _id: key as any });
    expect(room!.count).toBe(10);                       // no update clobbered another
  });

  it("different keys are independent", async () => {
    await bumpRateLimit(db, "ask:5.5.5.5", 60_000);
    await bumpRateLimit(db, "ask:6.6.6.6", 60_000);
    const a = await db.collection("rateLimits").findOne({ _id: "ask:5.5.5.5" as any });
    const b = await db.collection("rateLimits").findOne({ _id: "ask:6.6.6.6" as any });
    expect(a!.count).toBe(1);
    expect(b!.count).toBe(1);
  });

  it("actually persists windowStart, and a real elapsed window resets the count", async () => {
    const key = "ask:7.7.7.7";
    const windowMs = 50;                                  // short window so the test can wait it out for real
    const first = await bumpRateLimit(db, key, windowMs);
    expect(first.windowStart).toBeTypeOf("number");
    expect(first.count).toBe(1);

    await new Promise((r) => setTimeout(r, windowMs + 20));

    const afterExpiry = await bumpRateLimit(db, key, windowMs);
    expect(afterExpiry.count).toBe(1);                    // reset, not 2 — the bug this regresses left it stuck forever
    expect(afterExpiry.windowStart).toBeGreaterThan(first.windowStart);
  });
});
