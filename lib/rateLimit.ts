export interface WindowState { windowStart: number; count: number }

// Fixed-window counter: a request either lands in the current window (bump the
// count) or starts a fresh one (the previous window has expired).
export function nextWindowState(prev: WindowState | null, now: number, windowMs: number): WindowState {
  if (!prev || now - prev.windowStart >= windowMs) {
    return { windowStart: now, count: 1 };
  }
  return { windowStart: prev.windowStart, count: prev.count + 1 };
}

export function isAllowed(state: WindowState, limit: number): boolean {
  return state.count <= limit;
}

export function retryAfterMs(state: WindowState, windowMs: number, now: number): number {
  return Math.max(0, state.windowStart + windowMs - now);
}
