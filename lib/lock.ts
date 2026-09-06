export type Status = "idle" | "debating" | "error";
// `error` is idle-like: a failed round already released the lock (lib/liveRound.ts),
// so the room must be askable again rather than stuck forever.
export function canAsk(status: Status): boolean { return status !== "debating"; }
export function acquire(status: Status): { ok: boolean; next: Status } {
  if (status !== "debating") return { ok: true, next: "debating" };
  return { ok: false, next: status };
}
export function release(): Status { return "idle"; }
