import { describe, it, expect } from "vitest";
import { runRound, type CallModel } from "./round";
import { assignIndex, latestIndexOf, type Message } from "./messages";
import { speakingOrder, type PhilosopherId } from "./roster";
import type { Status } from "./lock";

// In-memory stand-in for the Mongo repo; append assigns the next index.
function makeFakeRepo(question: Message) {
  const messages: Message[] = [question];
  const repo = {
    status: "debating" as Status, messages,
    getTranscript: () => [...messages],
    appendPhilosopherTurn(speakerId: PhilosopherId, content: string): Message {
      const turn: Message = {
        index: assignIndex(latestIndexOf(messages)),
        role: "philosopher", speakerId, authorName: speakerId, content, createdAt: 0,
      };
      messages.push(turn); return turn;
    },
    setStatus(s: Status) { repo.status = s; },
  };
  return repo;
}
const personas = { nietzsche: "persona:nietzsche", marx: "persona:marx", beauvoir: "persona:beauvoir", foucault: "persona:foucault" };
const question: Message = { index: 0, role: "user", speakerId: "u_1", authorName: "Nadav", content: "Is the self free?", createdAt: 0 };

describe("the round loop", () => {
  it("appends exactly one turn per philosopher, in speaking order", async () => {
    const repo = makeFakeRepo(question);
    await runRound({ order: speakingOrder(0), personas, repo, callModel: async () => "…" });
    const turns = repo.messages.filter((m) => m.role === "philosopher");
    expect(turns.map((m) => m.speakerId)).toEqual(speakingOrder(0));
    expect(repo.messages.map((m) => m.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it("each philosopher sees every turn spoken before them (reaction chain)", async () => {
    const repo = makeFakeRepo(question);
    const seen: Record<string, string[]> = {};
    const callModel: CallModel = async (msgs) => {
      const speaker = msgs[0].content.replace("persona:", "");
      seen[speaker] = ["nietzsche", "marx", "beauvoir", "foucault"].filter((p) =>
        msgs[1].content.includes(`[${p[0].toUpperCase()}${p.slice(1)}]`));
      return `${speaker} responds`;
    };
    await runRound({ order: speakingOrder(0), personas, repo, callModel });
    expect(seen.nietzsche).toEqual([]);                                  // opens cold
    expect(seen.marx).toEqual(["nietzsche"]);                            // hears N
    expect(seen.beauvoir).toEqual(["nietzsche", "marx"]);                // hears N, M
    expect(seen.foucault).toEqual(["nietzsche", "marx", "beauvoir"]);    // hears all
  });

  it("releases the lock (status -> idle) when the round ends", async () => {
    const repo = makeFakeRepo(question);
    expect(repo.status).toBe("debating");
    await runRound({ order: speakingOrder(0), personas, repo, callModel: async () => "…" });
    expect(repo.status).toBe("idle");
  });

  it("calls the model exactly once per philosopher", async () => {
    const repo = makeFakeRepo(question);
    let calls = 0;
    await runRound({ order: speakingOrder(0), personas, repo, callModel: async () => (calls++, "…") });
    expect(calls).toBe(4);
  });
});
