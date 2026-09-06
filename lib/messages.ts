export type Role = "user" | "philosopher";
export interface Message {
  index: number; role: Role; speakerId: string; authorName: string;
  content: string; createdAt: number;
}
export function assignIndex(latestIndex: number): number { return latestIndex + 1; }
export function messagesSince(messages: Message[], since?: number | null): Message[] {
  if (since === undefined || since === null) return [...messages];
  return messages.filter((m) => m.index > since);
}
export function latestIndexOf(messages: Message[]): number {
  return messages.reduce((max, m) => Math.max(max, m.index), -1);
}

// A round starts at its opening question (a `role: "user"` message) and runs
// to the end of the transcript. Used to give the model an explicit boundary
// for "this round" (lib/prompt.ts) instead of leaving it to infer one from a
// long, undifferentiated transcript spanning every round ever asked.
export function currentRoundMessages(transcript: Message[]): Message[] {
  let start = 0;
  for (let i = transcript.length - 1; i >= 0; i--) {
    if (transcript[i].role === "user") { start = i; break; }
  }
  return transcript.slice(start);
}
