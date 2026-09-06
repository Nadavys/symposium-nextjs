export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/db";
import { getSince, RoomNotFoundError } from "../../../../../lib/roomRepo";
import { watchRoom, formatSseEvent } from "../../../../../lib/roomStream";
import { checkRateLimit } from "../../../../../lib/requestRateLimit";

// Reconnects included, so this is generous — locally, every dev-server request
// shares one "unknown" IP bucket (see lib/requestRateLimit.ts), and EventSource's
// auto-reconnect plus hot-reload drops can burn through a tight budget fast.
const STREAM_LIMIT_PER_HOUR = 120;
const HEARTBEAT_MS = 20_000;         // keeps intermediary proxies from treating the connection as idle

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await getDb();

  // A plain 429 JSON response isn't a valid SSE stream — EventSource can't
  // parse it, so it would just fire silent "error" events forever with no way
  // for the client to tell "rate limited" apart from "briefly offline". Emit
  // it as a real SSE event instead, same trick as `not_found` below.
  const { ok, retryAfterSec } = await checkRateLimit(db, request, "stream", STREAM_LIMIT_PER_HOUR);
  if (!ok) {
    return new Response(formatSseEvent({ retryAfterSec }, "rate_limited"), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let changeStream: ReturnType<typeof watchRoom> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // controller already closed (client disconnected) — nothing to do
        }
      };

      let initial;
      try {
        initial = await getSince(db, id);
      } catch (err) {
        if (err instanceof RoomNotFoundError) {
          send(formatSseEvent({}, "not_found"));
          controller.close();
          return;
        }
        throw err;
      }

      send(formatSseEvent(initial));
      changeStream = watchRoom(db, id, (snapshot) => send(formatSseEvent(snapshot)));
      heartbeat = setInterval(() => send(":\n\n"), HEARTBEAT_MS);

      request.signal.addEventListener("abort", () => {
        if (heartbeat) clearInterval(heartbeat);
        changeStream?.close().catch(() => {});
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      changeStream?.close().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
