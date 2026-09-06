import type { Db } from "mongodb";
import { getDb } from "./db";
import { getSince, appendTurn, setStatus, generateRoomName } from "./roomRepo";
import { runRound, type RoundRepo } from "./round";
import { speakingOrder, DISPLAY_NAME, type PhilosopherId } from "./roster";
import { PERSONAS } from "./personas";
import { callModel } from "./openaiClient";
import type { Message } from "./messages";

function makeMongoRoundRepo(db: Db, roomId: string): RoundRepo {
  return {
    async getTranscript() {
      const { messages } = await getSince(db, roomId);
      return messages;
    },
    async appendPhilosopherTurn(speakerId: PhilosopherId, content: string) {
      await appendTurn(db, roomId, { speakerId, authorName: DISPLAY_NAME[speakerId], content });
      const { messages } = await getSince(db, roomId);
      return messages[messages.length - 1];
    },
    async setStatus(status) {
      await setStatus(db, roomId, status);
    },
  };
}

// Walks the panel for one full round, then releases the lock. On any failure
// (model timeout, missing key, network) the room is marked `error` and the
// lock is released rather than left stuck in `debating` (ship checklist, guide §11).
export async function runFullRound(roomId: string): Promise<void> {
  const db = await getDb();
  try {
    const { messages, name } = await getSince(db, roomId);
    const userMessages = messages.filter((m: Message) => m.role === "user");
    
    // If the room doesn't have a generated name yet, create one from the first question
    if (!name && userMessages.length > 0) {
      generateRoomName(db, roomId, userMessages[0].content).catch(err => 
        console.error("background name generation failed:", err)
      );
    }

    const userTurns = userMessages.length;
    const order = speakingOrder(userTurns - 1);              // rotate the opener each round
    const repo = makeMongoRoundRepo(db, roomId);
    await runRound({ order, personas: PERSONAS, repo, callModel });
  } catch (err) {
    console.error(`round failed for room ${roomId}:`, err);
    await setStatus(db, roomId, "error");
  }
}
