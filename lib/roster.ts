export type PhilosopherId = "nietzsche" | "marx" | "beauvoir" | "foucault";
export const PANEL: PhilosopherId[] = ["nietzsche", "marx", "beauvoir", "foucault"];
export const DISPLAY_NAME: Record<PhilosopherId, string> = {
  nietzsche: "Nietzsche", marx: "Marx", beauvoir: "Beauvoir", foucault: "Foucault",
};
export const PORTRAIT: Record<PhilosopherId, string> = {
  nietzsche: "/portraits/Nietzsche.jpg",
  marx: "/portraits/Marx.jpg",
  beauvoir: "/portraits/Beauvoir.jpg",
  foucault: "/portraits/Foucault.jpg",
};
export const TAGLINE: Record<PhilosopherId, string> = {
  nietzsche: "Self-overcoming; morality as symptom.",
  marx: "Material conditions before ideas.",
  beauvoir: "Freedom inside a situation.",
  foucault: "The subject as an effect of power.",
};

export function speakingOrder(startAt = 0, panel: PhilosopherId[] = PANEL): PhilosopherId[] {
  const n = panel.length;
  const s = ((startAt % n) + n) % n;          // safe modulo for negatives
  return panel.map((_, i) => panel[(s + i) % n]);
}

export function isRoundComplete(spokenCount: number, panelSize = PANEL.length): boolean {
  return spokenCount >= panelSize;
}
