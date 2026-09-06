"use client";

import { useCallback, useEffect, useState } from "react";
import type { Message } from "../../../lib/messages";
import { latestIndexOf } from "../../../lib/messages";
import { canAsk, type Status } from "../../../lib/lock";
import { mergeMessages } from "../../../lib/roomState";
import { retryAfterSuffix } from "../../../lib/format";

export interface RoomStreamResponse {
  name: string | null;
  status: Status;
  latestIndex: number;
  messages: Message[];
}

export interface RoomStreamState {
  name: string | null;
  status: Status;
  lastIndex: number;
  messages: Message[];
  notFound: boolean;
  connected: boolean;         // false until the first server-sent event (or not_found/rate_limited) arrives
  rateLimited: boolean;       // the stream itself is throttled; a reconnect is already scheduled
}

export interface AskResult {
  ok: boolean;
  error?: string;
}

const INITIAL_STATE: RoomStreamState = {
  name: null, status: "idle", lastIndex: -1, messages: [], notFound: false, connected: false, rateLimited: false,
};

// Pure fold: incoming snapshot -> next state. Kept separate from the effect so
// it's unit-testable without React or a network — mergeMessages/latestIndexOf
// do the real work and are already proven in lib/roomState.test.ts and lib/messages.test.ts.
// The server (app/api/rooms/[id]/stream/route.ts) always pushes the FULL current
// state, not an incremental delta — mergeMessages' by-index dedupe makes that
// idempotent, so re-applying the same snapshot twice is harmless.
export function applyStreamResponse(state: RoomStreamState, delta: RoomStreamResponse): RoomStreamState {
  const messages = mergeMessages(state.messages, delta.messages);
  return {
    name: delta.name ?? state.name,
    status: delta.status,
    lastIndex: latestIndexOf(messages),
    messages,
    notFound: false,
    rateLimited: false,
    connected: true,
  };
}

export function useRoomStream(roomId: string) {
  const [state, setState] = useState<RoomStreamState>(INITIAL_STATE);

  useEffect(() => {
    let es: EventSource | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    function connect() {
      es = new EventSource(`/api/rooms/${roomId}/stream`);

      es.onmessage = (ev) => {
        const delta: RoomStreamResponse = JSON.parse(ev.data);
        setState((s) => applyStreamResponse(s, delta));
      };
      es.addEventListener("not_found", () => {
        es?.close();                                        // permanent — no point reconnecting
        setState((s) => ({ ...s, notFound: true, connected: true }));
      });
      // The stream endpoint is itself rate-limited (reconnect storms, mostly).
      // A plain 429 isn't a valid SSE payload, so the server instead sends this
      // event and closes — we schedule our own reconnect after the server's
      // Retry-After rather than letting the browser hammer it every few seconds.
      es.addEventListener("rate_limited", (ev) => {
        es?.close();
        const { retryAfterSec } = JSON.parse((ev as MessageEvent).data);
        setState((s) => ({ ...s, rateLimited: true, connected: true }));
        retryTimer = setTimeout(() => {
          if (cancelled) return;
          setState((s) => ({ ...s, rateLimited: false }));
          connect();
        }, Math.max(1, retryAfterSec) * 1000);
      });
      // Any other drop (network blip, the server function recycling) triggers the
      // browser's built-in EventSource reconnect — nothing to do here.
    }

    connect();
    return () => {
      cancelled = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [roomId]);

  const ask = useCallback(
    async (q: { userId: string; authorName: string; content: string }): Promise<AskResult> => {
      const res = await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(q),
      });
      if (res.status === 409) return { ok: false, error: "a round is already in progress" };
      if (res.status === 429) {
        return { ok: false, error: `too many questions${retryAfterSuffix(res.headers.get("Retry-After")) || " — wait a bit and try again"}` };
      }
      if (res.status === 404) return { ok: false, error: "this room no longer exists" };
      if (!res.ok) return { ok: false, error: "failed to submit question" };
      return { ok: true };
    },
    [roomId],
  );

  return { ...state, canAsk: canAsk(state.status), ask };
}
