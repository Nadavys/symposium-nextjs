// Per-browser identity for the "who asked" attribution (lib/prompt.ts). Not
// auth — just enough to label a question and let two open tabs act as two people.
const USER_ID_KEY = "symposium.userId";
const NAME_KEY = "symposium.name";

// localStorage can throw (Safari private mode / "block all cookies", a
// restrictive iframe embed) rather than just being unavailable — fall back to
// an in-memory value for the tab's lifetime instead of crashing the caller.
let memoryUserId: string | undefined;
let memoryName: string | undefined;

export function getOrCreateUserId(): string {
  try {
    let v = localStorage.getItem(USER_ID_KEY);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, v);
    }
    return v;
  } catch {
    if (!memoryUserId) memoryUserId = crypto.randomUUID();
    return memoryUserId;
  }
}

export function getName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? memoryName ?? "Guest";
  } catch {
    return memoryName ?? "Guest";
  }
}

export function setName(name: string): void {
  const v = name || "Guest";
  try {
    localStorage.setItem(NAME_KEY, v);
  } catch {
    memoryName = v;
  }
}
