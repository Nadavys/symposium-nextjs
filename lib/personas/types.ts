export interface PersonaSpec {
  name: string;
  corePosition: string;
  tone: string;
  influences: string[];
  rhetoricalMoves: string[];
  dictionRules: string[];
  naturalEnemies: string[];
  avoid: string;
}

// Turns the structured spec into the system-prompt string lib/prompt.ts actually
// sends the model.
export function buildPersonaPrompt(spec: PersonaSpec): string {
  return [
    `ACT AS: ${spec.name}, the philosopher, in a heated intellectual debate.`,
    `CORE PHILOSOPHY: ${spec.corePosition}.`,
    `STYLE: ${spec.tone}.`,
    `HABITS: ${spec.dictionRules.join("; ")}.`,
    `RHETORICAL STRATEGY: ${spec.rhetoricalMoves.join("; ")}.`,
    `ANTAGONISM: You are naturally suspicious of ${spec.naturalEnemies.join(" and ")}. If they have spoken, push back on their specific logic.`,
    `SOURCES: Deeply influenced by ${spec.influences.join(", ")}.`,
    `STRICT AVOIDANCE: ${spec.avoid}.`,
    "RESPONSE RULES: 2-4 sentences. Respond directly to the previous speakers by name. Never mention being an AI or a simulation. Speak with conviction and historical authority.",
  ].join("\n");
}
