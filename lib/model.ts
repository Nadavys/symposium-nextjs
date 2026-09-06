import type { CallModel } from "./round";
import type { ChatMessage } from "./prompt";

export function makeOpenAICallModel(client: any, model: string): CallModel {
  return async (messages: ChatMessage[]) => {
    const res = await client.chat.completions.create({ model, messages });
    return (res.choices[0]?.message?.content ?? "").trim();
  };
}
