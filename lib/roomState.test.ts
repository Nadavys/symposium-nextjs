import { describe, it, expect } from "vitest";
import { mergeMessages, roomNameFallback } from "./roomState";
import type { Message } from "./messages";

const m = (index: number): Message => ({
  index, role: "philosopher", speakerId: "marx", authorName: "Marx", content: `t${index}`, createdAt: 0,
});

describe("room state helpers", () => {
  it("merges snapshot messages in order and dedupes by index", () => {
    expect(mergeMessages([m(0), m(1)], [m(1), m(2)]).map((x) => x.index)).toEqual([0, 1, 2]);
  });
  it("a duplicate snapshot never doubles a message", () => {
    expect(mergeMessages([m(0), m(1), m(2)], [m(2)]).map((x) => x.index)).toEqual([0, 1, 2]);
  });
  it("room-name fallback truncates long questions and keeps short ones", () => {
    expect(roomNameFallback("Is the self free?")).toBe("Is the self free?");
    const out = roomNameFallback("What does it really mean to be free when society shapes every choice we make?", 24);
    expect(out.length).toBeLessThanOrEqual(24);
    expect(out.endsWith("…")).toBe(true);
  });
});
