import type { Message } from "./messages";

export function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byIndex = new Map<number, Message>();
  for (const m of existing) byIndex.set(m.index, m);
  for (const m of incoming) byIndex.set(m.index, m);      // duplicate index can't double
  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}
export function roomNameFallback(question: string, max = 48): string {
  const q = question.trim().replace(/\s+/g, " ");
  return q.length <= max ? q : q.slice(0, max - 1).trimEnd() + "…";
}
