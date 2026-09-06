import type { Message } from "./messages";
import { DISPLAY_NAME, type PhilosopherId } from "./roster";

export interface ChatMessage { role: "system" | "user"; content: string; }

export function attributeLine(m: Message): string {
  if (m.role === "user") return `[${m.authorName} asked]: ${m.content}`;
  const name = DISPLAY_NAME[m.speakerId as PhilosopherId] ?? m.speakerId;
  return `[${name}]: ${m.content}`;
}

export function buildTurnMessages(args: {
  transcript: Message[]; speakerId: PhilosopherId; personas: Record<string, string>;
}): ChatMessage[] {
  const { transcript, speakerId, personas } = args;
  const name = DISPLAY_NAME[speakerId];
  const attributed = transcript.map(attributeLine).join("\n");
  const user =
    `The discussion so far —\n${attributed}\n\n` +
    `Now respond as ${name}, engaging directly with what has been said. ` +
    `You must react to the specific points the other philosophers made earlier in this round — ` +
    `agree, rebut, or build on their actual claims by name. Do not ignore them or restate your ` +
    `own position as if speaking in isolation.`;
  return [
    { role: "system", content: personas[speakerId] },
    { role: "user", content: user },
  ];
}
