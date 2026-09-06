import { RoomNotFoundError } from "../../../lib/roomRepo";

export async function handleAsk(deps: any, roomId: string, q: any) {
  const { ok, reason } = await deps.tryAcquireAndAsk(roomId, q);
  if (!ok) {
    if (reason === "not_found") return { status: 404, body: { error: "room not found" } };
    return { status: 409, body: { error: "a round is already in progress" } };
  }
  deps.startRound(roomId);                          // after(() => runRound(...)) — non-blocking
  return { status: 202, body: { ok: true } };
}

export async function handleGet(deps: any, roomId: string, since?: number) {
  try {
    const room = await deps.getSince(roomId, since);
    return { status: 200, body: room };
  } catch (err) {
    if (err instanceof RoomNotFoundError) return { status: 404, body: { error: "room not found" } };
    throw err;
  }
}

export async function handleList(deps: any, limit?: number) {
  const rooms = await deps.listRooms(limit);
  return { status: 200, body: { rooms } };
}
