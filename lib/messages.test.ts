import { describe, it, expect } from "vitest";
import { assignIndex, messagesSince, latestIndexOf, currentRoundMessages, type Message } from "./messages";

const msg = (index: number): Message => ({
  index, role: "philosopher", speakerId: "marx", authorName: "Marx",
  content: `turn ${index}`, createdAt: 0,
});
const ask = (index: number): Message => ({
  index, role: "user", speakerId: "u_1", authorName: "Nadav",
  content: `question ${index}`, createdAt: 0,
});
const thread: Message[] = [msg(0), msg(1), msg(2), msg(3)];

describe("index + since (snapshot core)", () => {
  it("assigns the next index; an empty room (-1) starts at 0", () => {
    expect(assignIndex(-1)).toBe(0);
    expect(assignIndex(3)).toBe(4);
  });
  it("no `since` returns the whole thread (cold load / refresh)", () => {
    expect(messagesSince(thread).map((m) => m.index)).toEqual([0, 1, 2, 3]);
    expect(messagesSince(thread, null).map((m) => m.index)).toEqual([0, 1, 2, 3]);
  });
  it("`since=N` returns only strictly-newer messages (exclusive)", () => {
    expect(messagesSince(thread, 1).map((m) => m.index)).toEqual([2, 3]);
    expect(messagesSince(thread, 2).map((m) => m.index)).toEqual([3]);
  });
  it("a caught-up client gets nothing", () => {
    expect(messagesSince(thread, 3)).toEqual([]);
  });
  it("latestIndexOf reports the cursor, -1 when empty", () => {
    expect(latestIndexOf(thread)).toBe(3);
    expect(latestIndexOf([])).toBe(-1);
  });
});

describe("currentRoundMessages", () => {
  it("a single round is the whole transcript", () => {
    const single = [ask(0), msg(1), msg(2)];
    expect(currentRoundMessages(single)).toEqual(single);
  });
  it("cuts off everything before the most recent question — earlier rounds aren't \"this round\"", () => {
    const multi = [ask(0), msg(1), msg(2), msg(3), msg(4), ask(5), msg(6)];
    expect(currentRoundMessages(multi).map((m) => m.index)).toEqual([5, 6]);
  });
  it("a question with no answers yet is a round of one", () => {
    const multi = [ask(0), msg(1), msg(2), msg(3), msg(4), ask(5)];
    expect(currentRoundMessages(multi).map((m) => m.index)).toEqual([5]);
  });
  it("no question at all (malformed) falls back to the whole transcript rather than throwing", () => {
    expect(currentRoundMessages(thread)).toEqual(thread);
  });
});
