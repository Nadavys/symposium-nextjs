import OpenAI from "openai";
import { makeOpenAICallModel } from "./model";
import type { CallModel } from "./round";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const TIMEOUT_MS = 20_000;

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey, timeout: TIMEOUT_MS });
  }
  return client;
}

export const callModel: CallModel = (messages) => makeOpenAICallModel(getClient(), MODEL)(messages);
