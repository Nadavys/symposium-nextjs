import { describe, it, expect } from "vitest";
import { buildPersonaPrompt, type PersonaSpec } from "./types";

const spec: PersonaSpec = {
  name: "Test Philosopher",
  corePosition: "Everything is contingent",
  tone: "Dry, understated",
  influences: ["Book One", "Book Two"],
  rhetoricalMoves: ["asks a rhetorical question", "reframes the premise"],
  dictionRules: ["use short words", "avoid jargon"],
  naturalEnemies: ["Idealists", "Essentialists"],
  avoid: "grand universal claims",
};

describe("buildPersonaPrompt", () => {
  it("names the philosopher and states it's a heated debate", () => {
    expect(buildPersonaPrompt(spec)).toContain("ACT AS: Test Philosopher");
    expect(buildPersonaPrompt(spec)).toContain("heated intellectual debate");
  });
  it("includes every field from the spec", () => {
    const prompt = buildPersonaPrompt(spec);
    expect(prompt).toContain("Everything is contingent");
    expect(prompt).toContain("Dry, understated");
    expect(prompt).toContain("Book One, Book Two");
    expect(prompt).toContain("asks a rhetorical question; reframes the premise");
    expect(prompt).toContain("use short words; avoid jargon");
    expect(prompt).toContain("Idealists and Essentialists");
    expect(prompt).toContain("grand universal claims");
  });
  it("always closes with the shared length and character constraint", () => {
    expect(buildPersonaPrompt(spec)).toContain(
      "2-4 sentences",
    );
    expect(buildPersonaPrompt(spec)).toContain(
      "Never mention being an AI",
    );
  });
});
