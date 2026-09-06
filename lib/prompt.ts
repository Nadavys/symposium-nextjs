import type { Message } from "./messages";
import { currentRoundMessages } from "./messages";
import { DISPLAY_NAME, type PhilosopherId } from "./roster";

export interface ChatMessage { role: "system" | "user"; content: string; }

export function attributeLine(m: Message): string {
  if (m.role === "user") return `[${m.authorName} asked]: ${m.content}`;
  const name = DISPLAY_NAME[m.speakerId as PhilosopherId] ?? m.speakerId;
  return `[${name}]: ${m.content}`;
}

// The transcript spans every round ever asked in the room, but a speaker
// should only be arguing against THIS round's question and whoever has
// already answered it — not re-litigating earlier, already-resolved rounds.
// Rather than leave that boundary to the model to infer from one long flat
// transcript (it doesn't reliably), it's made explicit here: earlier rounds
// are given as background only, and this round is called out as the thing
// to actually respond to.
export function buildTurnMessages(args: {
  transcript: Message[]; speakerId: PhilosopherId; personas: Record<string, string>;
}): ChatMessage[] {
  const { transcript, speakerId, personas } = args;
  const name = DISPLAY_NAME[speakerId];
  const current = currentRoundMessages(transcript);
  const earlier = transcript.slice(0, transcript.length - current.length);
  const topic = current[0];                 // currentRoundMessages always starts at the round's ask
  const answeredSoFar = current.slice(1);

  const earlierBlock = earlier.length > 0
    ? `Earlier rounds, for background only — these are settled, do not re-litigate them:\n${earlier.map(attributeLine).join("\n")}\n\n`
    : "";
  const answeredBlock = answeredSoFar.length > 0
    ? `\nAlready answered this round —\n${answeredSoFar.map(attributeLine).join("\n")}`
    : "";

  const user =
    earlierBlock +
    `THIS ROUND'S TOPIC — the question you must respond to:\n${topic ? attributeLine(topic) : "No topic provided."}\n` +
    answeredBlock +
    `\n\nNow respond as ${name}. ` +
    `CRITICAL INSTRUCTIONS FOR THIS TURN:\n` +
    `1. Focus primarily on the question posed in THIS ROUND'S TOPIC above.\n` +
    `2. Engage directly with the arguments made by the other philosophers in this round. ` +
    `While you should respond to the most recent speaker, you must also synthesize or challenge the ` +
    `contributions of everyone else who has spoken in this round so far.\n` +
    `3. Address your peers by name (e.g., "As [Name] suggested...") and react to their specific claims.\n` +
    `4. Do not drift back into re-litigating earlier rounds; use them only as background for your established persona.\n` +
    `5. Do not simply restate your own opening position; evolve your argument based on the current discussion.`;
  return [
    {
      role: "system",
      content: `${personas[speakerId]}\n\nYou are participating in a group discussion. Always ensure your response is a direct continuation of the current round's conversation.`,
    },
    { role: "user", content: user },
  ];
}
