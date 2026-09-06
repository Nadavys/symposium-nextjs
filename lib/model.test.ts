import { it, expect, vi } from "vitest";
import { makeOpenAICallModel } from "./model";

it("sends our messages and returns the completion text", async () => {
  const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: "  a turn  " } }] });
  const fakeClient = { chat: { completions: { create } } } as any;
  const callModel = makeOpenAICallModel(fakeClient, "gpt-5");
  const out = await callModel([
    { role: "system", content: "persona" },
    { role: "user", content: "the discussion so far…" },
  ]);
  expect(out).toBe("a turn");                             // trimmed
  expect(create).toHaveBeenCalledOnce();
  expect(create.mock.calls[0][0].messages[0].content).toBe("persona");
});
