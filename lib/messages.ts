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
