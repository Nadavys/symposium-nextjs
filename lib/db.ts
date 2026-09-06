import { MongoClient, type Db } from "mongodb";

// Cached on globalThis so hot-reload / repeated invocations reuse one connection
// instead of opening a new one per request (ship checklist, guide §11).
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  return uri;
}

// Abandoned rooms expire on their own rather than accumulating forever (ship checklist, guide §11).
const ROOM_TTL_SECONDS = 60 * 60 * 24;

export function getMongoClient(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    const promise: Promise<MongoClient> = new MongoClient(getUri()).connect().then(async (client) => {
      const db = client.db();
      await db.collection("rooms").createIndex({ lastActivityAt: 1 }, { expireAfterSeconds: ROOM_TTL_SECONDS });
      // rateLimits documents set their own expiresAt (2x the caller's window); TTL cleans them up regardless of window size.
      await db.collection("rateLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      return client;
    });
    globalForMongo._mongoClientPromise = promise;
    // A rejected promise is still a truthy cache value — without this, one
    // transient connect()/createIndex() failure would permanently poison every
    // subsequent request on this server instance with no way to retry.
    promise.catch(() => {
      if (globalForMongo._mongoClientPromise === promise) {
        globalForMongo._mongoClientPromise = undefined;
      }
    });
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db();
}
