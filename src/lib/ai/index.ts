import { mockAnalyzePages, mockExamProfile } from "./mock";
export type { PageAnalysis } from "./mock";

/** « claude » si une clé existe, sinon « mock ». L'appel réel à Claude arrive avec la génération (phase 3). */
export const AI_MODE: "claude" | "mock" = process.env.ANTHROPIC_API_KEY ? "claude" : "mock";

export async function analyzePages(texts: string[]) {
  // TODO(phase 3) : appel Claude quand AI_MODE === "claude" ; en attendant, heuristique simulée.
  return mockAnalyzePages(texts);
}
export async function buildExamProfile(annalesTexts: string[]) {
  return mockExamProfile(annalesTexts);
}
