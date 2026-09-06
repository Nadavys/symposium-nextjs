import { describe, it, expect } from "vitest";
import { roomSnapshotFromDoc } from "./roomRepo";

describe("roomSnapshotFromDoc", () => {
  it("extracts the pushable snapshot fields from a raw Mongo room document", () => {
    const doc = {
      _id: "r1",
      name: "Is the self free?",
      status: "debating",
      latestIndex: 2,
      philosopherIds: ["nietzsche", "marx"],
      createdAt: 0,
      lastActivityAt: 0,
      messages: [{ index: 0, role: "user", speakerId: "u1", authorName: "A", content: "Q?", createdAt: 0 }],
    };
    expect(roomSnapshotFromDoc(doc)).toEqual({
      name: "Is the self free?",
      status: "debating",
      latestIndex: 2,
      messages: doc.messages,
    });
  });
});
