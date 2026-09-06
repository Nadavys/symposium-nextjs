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
  it("requires the speaker to react to what the other philosophers said, not speak in isolation", () => {
    const [, user] = buildTurnMessages({ transcript, speakerId: "foucault", personas });
    expect(user.content).toContain("You must react to the specific points the other philosophers made");
    expect(user.content).toContain("Do not ignore them or restate your own position as if speaking in isolation");
  });
});
