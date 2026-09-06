import { describe, it, expect } from "vitest";
import { PANEL, speakingOrder, isRoundComplete } from "./roster";

describe("roster / round order", () => {
  it("the panel is the fixed four, in canonical order", () => {
    expect(PANEL).toEqual(["nietzsche", "marx", "beauvoir", "foucault"]);
  });
  it("default speaking order matches the panel", () => {
    expect(speakingOrder(0)).toEqual(["nietzsche", "marx", "beauvoir", "foucault"]);
  });
  it("rotating the start moves the opener without dropping anyone", () => {
    expect(speakingOrder(1)).toEqual(["marx", "beauvoir", "foucault", "nietzsche"]);
    expect(speakingOrder(3)).toEqual(["foucault", "nietzsche", "marx", "beauvoir"]);
    expect([...speakingOrder(2)].sort()).toEqual([...PANEL].sort());
  });
  it("negative or wrapping start indices are safe", () => {
    expect(speakingOrder(-1)).toEqual(speakingOrder(3));
    expect(speakingOrder(4)).toEqual(speakingOrder(0));
  });
  it("a round completes only after all four have spoken", () => {
    expect(isRoundComplete(3)).toBe(false);
    expect(isRoundComplete(4)).toBe(true);
  });
});
