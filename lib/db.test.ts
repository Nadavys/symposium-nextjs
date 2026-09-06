import { describe, it, expect, vi, beforeEach } from "vitest";

const connectMock = vi.fn();

vi.mock("mongodb", () => ({
  MongoClient: vi.fn().mockImplementation(() => ({ connect: connectMock })),
}));

import { getMongoClient } from "./db";

describe("getMongoClient", () => {
  beforeEach(() => {
    (globalThis as any)._mongoClientPromise = undefined;
    connectMock.mockReset();
    process.env.MONGODB_URI = "mongodb://test";
  });

  it("does not cache a rejected connection — the next call retries instead of replaying the same failure", async () => {
    const createIndex = vi.fn().mockResolvedValue(undefined);
    const fakeClient = { db: () => ({ collection: () => ({ createIndex }) }) };
    connectMock.mockRejectedValueOnce(new Error("transient connect failure"));
    connectMock.mockResolvedValueOnce(fakeClient);

    await expect(getMongoClient()).rejects.toThrow("transient connect failure");
    await new Promise((r) => setTimeout(r, 0));      // let the internal cache-clearing .catch() run

    const client = await getMongoClient();
    expect(client).toBe(fakeClient);
    expect(connectMock).toHaveBeenCalledTimes(2);
  });

  it("reuses the same cached promise on repeated success (no reconnect per call)", async () => {
    const createIndex = vi.fn().mockResolvedValue(undefined);
    const fakeClient = { db: () => ({ collection: () => ({ createIndex }) }) };
    connectMock.mockResolvedValue(fakeClient);

    const [a, b] = await Promise.all([getMongoClient(), getMongoClient()]);
    expect(a).toBe(fakeClient);
    expect(b).toBe(fakeClient);
    expect(connectMock).toHaveBeenCalledTimes(1);
  });
});
