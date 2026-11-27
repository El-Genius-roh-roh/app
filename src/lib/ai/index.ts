import { mockAnalyzePages } from "./mock";
export type { PageAnalysis } from "./mock";

/** Analyse des pages (type, chapitre, densité) : heuristique simulée. Les questions, elles, peuvent venir du chat (src/lib/quiz/chat.ts). */
export async function analyzePages(texts: string[]) {
  return mockAnalyzePages(texts);
}
