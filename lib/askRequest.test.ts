import { describe, it, expect } from "vitest";
import { validateAskRequest } from "./askRequest";

describe("validateAskRequest", () => {
  it("accepts a well-formed body", () => {
    expect(validateAskRequest({ userId: "u1", authorName: "A", content: "Is the self free?" })).toEqual({
      userId: "u1", authorName: "A", content: "Is the self free?",
    });
  });

  it("rejects non-object/null bodies", () => {
    expect(validateAskRequest(null)).toBeNull();
    expect(validateAskRequest("nope")).toBeNull();
    expect(validateAskRequest(42)).toBeNull();
  });

  it("rejects missing, non-string, or blank fields", () => {
    expect(validateAskRequest({ authorName: "A", content: "Q?" })).toBeNull();          // missing userId
    expect(validateAskRequest({ userId: "u1", authorName: "A", content: 123 })).toBeNull(); // non-string content
    expect(validateAskRequest({ userId: "u1", authorName: "A", content: "   " })).toBeNull(); // blank content
  });

  it("rejects fields over the length cap", () => {
    expect(validateAskRequest({ userId: "u1", authorName: "A", content: "x".repeat(2001) })).toBeNull();
    expect(validateAskRequest({ userId: "u1", authorName: "x".repeat(101), content: "Q?" })).toBeNull();
  });
});
