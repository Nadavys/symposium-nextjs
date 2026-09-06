import type { Message } from "./messages";
import type { Status } from "./lock";
import type { ChatMessage } from "./prompt";
import { buildTurnMessages } from "./prompt";
import { release } from "./lock";
import { type PhilosopherId } from "./roster";

export interface RoundRepo {
  getTranscript(): Message[] | Promise<Message[]>;
  appendPhilosopherTurn(speakerId: PhilosopherId, content: string): Message | Promise<Message>;
  setStatus(status: Status): void | Promise<void>;
}
export type CallModel = (messages: ChatMessage[]) => Promise<string>;

// TODO: this walks a fixed `order` computed up front (lib/roster.ts's
// speakingOrder / lib/liveRound.ts) — everyone speaks exactly once, in a
// mechanically rotating slot, whether or not they have anything to add. The
// debate should feel like a real discussion instead: a philosopher replies
// because they want to agree, add to, or contradict what was just said, not
// because it's their turn. That means picking the next speaker dynamically
// (e.g. an LLM call after each turn, given the transcript so far, choosing
// who responds next and letting the round end when no one has more to add)
// rather than precomputing `order` before the round starts. `runRound` itself
// is already the right shape for this — swap the `for (const speakerId of
// order)` loop for a "pick next speaker, or stop" step and the RoundRepo/
// CallModel contracts don't need to change.
export async function runRound(args: {
  order: PhilosopherId[]; personas: Record<string, string>;
  repo: RoundRepo; callModel: CallModel;
}): Promise<Message[]> {
  const { order, personas, repo, callModel } = args;
  for (const speakerId of order) {
    const transcript = await repo.getTranscript();          // every turn already spoken
    const messages = buildTurnMessages({ transcript, speakerId, personas });
    const content = await callModel(messages);
    await repo.appendPhilosopherTurn(speakerId, content);
  }
  await repo.setStatus(release());
  return repo.getTranscript();
}
