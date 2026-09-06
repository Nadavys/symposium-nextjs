import { Db } from "mongodb";
import { PANEL } from "./roster";
import { roomNameFallback } from "./roomState";
import { messagesSince, type Message } from "./messages";
import type { Status } from "./lock";
import { callModel } from "./openaiClient";

export interface RoomSnapshot {
  name: string | null;
  status: Status;
  latestIndex: number;
  messages: Message[];
}

// Shared shape between a one-shot snapshot (getSince) and a change-stream push
// (lib/roomStream.ts) — both read the same raw Mongo room document.
export function roomSnapshotFromDoc(doc: any): RoomSnapshot {
  return { name: doc.name, status: doc.status, latestIndex: doc.latestIndex, messages: doc.messages };
}

// Generates a short, punchy, editorial-style title for the room based on the
// first question. Used to replace the fallback truncation for a better UI.
export async function generateRoomName(db: Db, id: string, question: string): Promise<string> {
  try {
    const prompt = `Turn this question into a short, sophisticated, editorial title (max 5 words) for a philosophical debate. 
    Examples: 
    "Is the self an illusion?" -> The Illusion of Self
    "Should we be afraid of AI?" -> The Ghost in the Machine
    "Does God exist?" -> The Eternal Silence
    
    Question: "${question}"
    Title:`;

    const title = await callModel([{ role: "user", content: prompt }]);
    const name = title.trim().replace(/^["']|["']$/g, ""); // strip quotes
    
    await db.collection("rooms").updateOne(
      { _id: id as any },
      { $set: { name } }
    );
    
    return name;
  } catch (err) {
    console.error("failed to generate room name:", err);
    return roomNameFallback(question);
  }
}

// Thrown by getSince when the room id doesn't match any document, so callers
// (app/api/rooms/handlers.ts) can translate it into a 404 instead of a generic 500.
export class RoomNotFoundError extends Error {
  constructor(id: string) {
    super(`room not found: ${id}`);
    this.name = "RoomNotFoundError";
  }
}

export async function createRoom(db: Db): Promise<string> {
  const _id = crypto.randomUUID();
  await db.collection("rooms").insertOne({
    _id: _id as any, name: null, philosopherIds: PANEL, status: "idle",
    latestIndex: -1, messages: [], createdAt: Date.now(), lastActivityAt: Date.now(),
  });
  return _id;
}

// (a) acquire the lock AND save the question in ONE conditional update.
// `reason` on failure distinguishes "someone else is mid-round" (locked) from
// "this room id doesn't exist at all" (not_found) — both give modifiedCount 0.
export async function tryAcquireAndAsk(
  db: Db,
  id: string,
  q: { userId: string; authorName: string; content: string },
): Promise<{ ok: boolean; reason?: "locked" | "not_found" }> {
  const fallbackName = roomNameFallback(q.content);
  const res = await db.collection("rooms").updateOne(
    { _id: id as any, status: { $ne: "debating" } },            // idle or a prior error, not mid-round
    [{
      $set: {
        status: "debating",
        name: { $ifNull: ["$name", fallbackName] },
        latestIndex: { $add: ["$latestIndex", 1] },
        lastActivityAt: Date.now(),
        messages: {
          $concatArrays: ["$messages", [{
            index: { $add: ["$latestIndex", 1] }, role: "user",
            speakerId: q.userId, authorName: q.authorName, content: q.content, createdAt: Date.now(),
          }]],
        },
      },
    }]
  );
  if (res.modifiedCount === 1) return { ok: true };
  const exists = await db.collection("rooms").findOne({ _id: id as any }, { projection: { _id: 1 } });
  return { ok: false, reason: exists ? "locked" : "not_found" };
}

// (b) append a philosopher turn; index assigned atomically from latestIndex.
// authorName is the caller's job to resolve (see lib/liveRound.ts) — this layer
// just stores whatever display name it's given, verbatim.
export async function appendTurn(db: Db, id: string, t: { speakerId: string; authorName: string; content: string }) {
  await db.collection("rooms").updateOne(
    { _id: id as any },
    [{
      $set: {
        latestIndex: { $add: ["$latestIndex", 1] },
        lastActivityAt: Date.now(),
        messages: {
          $concatArrays: ["$messages", [{
            index: { $add: ["$latestIndex", 1] }, role: "philosopher",
            speakerId: t.speakerId, authorName: t.authorName, content: t.content, createdAt: Date.now(),
          }]],
        },
      },
    }]
  );
}

// Release the lock (idle) or surface a failed round (error) — see runFullRound.
export async function setStatus(db: Db, id: string, status: Status) {
  await db.collection("rooms").updateOne(
    { _id: id as any },
    { $set: { status, lastActivityAt: Date.now() } },
  );
}

export interface RoomSummary {
  id: string;
  name: string | null;
  status: Status;
  latestIndex: number;
  createdAt: number;
  lastActivityAt: number;
}

// Newest-active-first; projected without `messages` so listing stays cheap
// regardless of how long individual rooms' transcripts get.
export async function listRooms(db: Db, limit = 50): Promise<RoomSummary[]> {
  const rooms = await db
    .collection("rooms")
    .find({}, { projection: { messages: 0 } })
    .sort({ lastActivityAt: -1 })
    .limit(limit)
    .toArray();
  return rooms.map((r: any) => ({
    id: r._id,
    name: r.name,
    status: r.status,
    latestIndex: r.latestIndex,
    createdAt: r.createdAt,
    lastActivityAt: r.lastActivityAt,
  }));
}

export async function getSince(db: Db, id: string, since?: number) {
  const room = await db.collection("rooms").findOne({ _id: id as any });
  if (!room) throw new RoomNotFoundError(id);
  const snapshot = roomSnapshotFromDoc(room);
  return { ...snapshot, messages: messagesSince(snapshot.messages, since) };
}
