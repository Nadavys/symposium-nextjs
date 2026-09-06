import type { PhilosopherId } from "../roster";
import { buildPersonaPrompt } from "./types";
import { nietzsche } from "./nietzsche";
import { marx } from "./marx";
import { beauvoir } from "./beauvoir";
import { foucault } from "./foucault";

export const PERSONAS: Record<PhilosopherId, string> = {
  nietzsche: buildPersonaPrompt(nietzsche),
  marx: buildPersonaPrompt(marx),
  beauvoir: buildPersonaPrompt(beauvoir),
  foucault: buildPersonaPrompt(foucault),
};
