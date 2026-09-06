import { describe, it, expect } from "vitest";
import { buildTurnMessages, attributeLine } from "./prompt";
import type { Message } from "./messages";

const personas = {
  nietzsche: "You are Friedrich Nietzsche. Speak in aphorisms.",
  marx: "You are Karl Marx. Everything is class and material conditions.",
  beauvoir: "You are Simone de Beauvoir. Freedom is situated.",
  foucault: "You are Michel Foucault. Trace the workings of power.",
};
const transcript: Message[] = [
  { index: 0, role: "user", speakerId: "u_1", authorName: "Nadav", content: "Is the self free?", createdAt: 0 },
  { index: 1, role: "philosopher", speakerId: "nietzsche", authorName: "Nietzsche", content: "The self is a creation.", createdAt: 0 },
  { index: 2, role: "philosopher", speakerId: "marx", authorName: "Marx", content: "The self is produced by its conditions.", createdAt: 0 },
];

describe("attributed prompt builder (the reaction mechanism)", () => {
  it("labels human questions and philosopher turns by name", () => {
    expect(attributeLine(transcript[0])).toBe("[Nadav asked]: Is the self free?");
    expect(attributeLine(transcript[1])).toBe("[Nietzsche]: The self is a creation.");
  });
  it("uses the speaker's persona as the system prompt", () => {
    const [system] = buildTurnMessages({ transcript, speakerId: "foucault", personas });
    expect(system.role).toBe("system");
    expect(system.content).toBe(personas.foucault);
  });
  it("feeds the next speaker every prior turn, attributed, and cues them to respond", () => {
    const [, user] = buildTurnMessages({ transcript, speakerId: "foucault", personas });
    expect(user.content).toContain("[Nietzsche]: The self is a creation.");
    expect(user.content).toContain("[Marx]: The self is produced by its conditions.");
    expect(user.content).toContain("[Nadav asked]: Is the self free?");
    expect(user.content).toContain("Now respond as Foucault, engaging directly");
  });
  it("centers the response on the round's topic while still requiring every prior speaker this round to be engaged, not just the most recent", () => {
    const [, user] = buildTurnMessages({ transcript, speakerId: "foucault", personas });
    expect(user.content).toContain("Center your response on that question");
    expect(user.content).toContain("engage every other philosopher who has already answered it this round");
    expect(user.content).toContain("do not respond only to whoever spoke last and ignore the rest");
  });

  it("presents the round's opening question as the explicit topic, separate from who's answered it so far", () => {
    const [, user] = buildTurnMessages({ transcript, speakerId: "foucault", personas });
    expect(user.content).toContain("THIS ROUND'S TOPIC — the question you must respond to:\n[Nadav asked]: Is the self free?");
    expect(user.content).toContain("Already answered this round —\n[Nietzsche]: The self is a creation.\n[Marx]: The self is produced by its conditions.");
    // The topic is called out before the "already answered" list, not buried inside it.
    expect(user.content.indexOf("THIS ROUND'S TOPIC")).toBeLessThan(user.content.indexOf("Already answered this round"));
  });

  it("marks an earlier round as settled background, distinct from the current round's topic", () => {
    const twoRounds: Message[] = [
      ...transcript, // round 1: Nadav asks, Nietzsche + Marx answer
      { index: 3, role: "philosopher", speakerId: "beauvoir", authorName: "Beauvoir", content: "Freedom is always situated.", createdAt: 0 },
      { index: 4, role: "philosopher", speakerId: "foucault", authorName: "Foucault", content: "Even situations are effects of power.", createdAt: 0 },
      { index: 5, role: "user", speakerId: "u_1", authorName: "Nadav", content: "So is there any real choice?", createdAt: 0 },
      { index: 6, role: "philosopher", speakerId: "nietzsche", authorName: "Nietzsche", content: "Choice is the strong imposing form on chaos.", createdAt: 0 },
    ];
    const [, user] = buildTurnMessages({ transcript: twoRounds, speakerId: "marx", personas });
    // Round 1 content is present, but explicitly labeled as background/settled, not the topic.
    expect(user.content).toContain("Earlier rounds, for background only — these are settled, do not re-litigate them");
    expect(user.content).toContain("[Nietzsche]: The self is a creation.");
    // Round 2's question is the explicit topic; its one answer so far is called out separately.
    expect(user.content).toContain("THIS ROUND'S TOPIC — the question you must respond to:\n[Nadav asked]: So is there any real choice?");
    expect(user.content).toContain("Already answered this round —\n[Nietzsche]: Choice is the strong imposing form on chaos.");
    expect(user.content).toContain("do not drift back into earlier rounds — they're already resolved");
    // The earlier-rounds block appears before the current round's topic in the prompt.
    expect(user.content.indexOf("Earlier rounds")).toBeLessThan(user.content.indexOf("THIS ROUND'S TOPIC"));
  });

  it("a round with no answers yet still states the topic, with no dangling 'already answered' section", () => {
    const openingOnly: Message[] = [transcript[0]];
    const [, user] = buildTurnMessages({ transcript: openingOnly, speakerId: "nietzsche", personas });
    expect(user.content).toContain("THIS ROUND'S TOPIC — the question you must respond to:\n[Nadav asked]: Is the self free?");
    expect(user.content).not.toContain("Already answered this round");
  });
});
