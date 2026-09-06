import type { ChangeStream, Db } from "mongodb";
import { roomSnapshotFromDoc, type RoomSnapshot } from "./roomRepo";

// Every write to a room (tryAcquireAndAsk, appendTurn, setStatus in
// lib/roomRepo.ts) is an updateOne on this same document, so watching it here
// is the only plumbing needed to react to all of them.
export function watchRoom(db: Db, roomId: string, onChange: (snapshot: RoomSnapshot) => void): ChangeStream {
  const changeStream = db.collection("rooms").watch(
    [{ $match: { "documentKey._id": roomId, operationType: { $in: ["update", "replace"] } } }],
    { fullDocument: "updateLookup" },
  );
  changeStream.on("change", (change: any) => {
    if (change.fullDocument) onChange(roomSnapshotFromDoc(change.fullDocument));
  });
  return changeStream;
}

// SSE wire format: `event:` line is optional (bare "message" events omit it),
// `data:` carries the JSON payload, blank line terminates the event.
export function formatSseEvent(data: unknown, event?: string): string {
  const lines: string[] = [];
  if (event) lines.push(`event: ${event}`);
  lines.push(`data: ${JSON.stringify(data)}`);
  return lines.join("\n") + "\n\n";
}
