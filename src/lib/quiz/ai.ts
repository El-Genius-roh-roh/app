// GÉNÉRATION AUTOMATIQUE PAR L'IA (docs/03) : le même prompt que la génération « par le chat »,
// mais envoyé directement au modèle, puis une seconde passe indépendante vérifie chaque réponse.
import { CONFIG } from "@/config/constants";
import { chatLLM, llmConfigured } from "../ai/llm";
import { addDays, todayParis } from "../clock";
import { buildChatPrompt, extractJson, importChatAnswer, type ImportResult, type PromptOptions, type Verifier } from "./chat";

const SYSTEME = "Tu es un professeur rigoureux qui rédige des quiz de révision en français. Tu réponds uniquement avec du JSON valide, sans texte autour.";

/** Seconde passe : le modèle répond aux questions SANS connaître la bonne réponse. */
export const verifierIA: Verifier = async (qs) => {
  const liste = qs.map((x, i) => `${i + 1}. ${x.enonce}\n${x.choix.map((c, j) => `   ${j}) ${c}`).join("\n")}`).join("\n\n");
  const txt = await chatLLM([
    { role: "system", content: SYSTEME },
    { role: "user", content: `Réponds à chacune de ces questions de cours. Pour chaque question, donne l'index (à partir de 0) du choix correct, ou null si aucune réponse n'est correcte ou si plusieurs le sont.\n\n${liste}\n\nRéponds uniquement : {"reponses":[0,2,null,...]} (une valeur par question, dans l'ordre).` },
  ], { maxTokens: 400, temperature: 0 });
  const r = (extractJson(txt) as { reponses?: unknown[] }).reponses ?? [];
  return qs.map((_, i) => (typeof r[i] === "number" ? (r[i] as number) : null));
};

/** Génère (ou refait) les quiz des prochains jours d'une matière avec l'IA. Un appel par jour. */
export async function genererAvecIA(subjectId: string, o: PromptOptions = {}): Promise<ImportResult> {
  const out: ImportResult = [];
  const max = o.limit ?? CONFIG.CHAT_JOURS_PAR_LOT;
  for (let i = 0; i < max; i++) {
    const p = await buildChatPrompt(subjectId, { ...o, limit: CONFIG.LLM_JOURS_PAR_APPEL });
    if (!p) break;
    try {
      const txt = await chatLLM([{ role: "system", content: SYSTEME }, { role: "user", content: p.prompt }]);
      const res = await importChatAnswer(subjectId, txt, { verifier: verifierIA });
      out.push(...res);
      if (res.every((r) => r.erreur)) break; // rien d'importé : on n'insiste pas (évite une boucle)
    } catch (e) {
      out.push(...p.dates.map((date) => ({ date, erreur: (e as Error).message })));
      break;
    }
    if (o.dayId) break;
  }
  return out;
}

// Une seule génération à la fois par matière (plusieurs pages ouvertes = un seul appel).
const enCours = new Map<string, Promise<ImportResult>>();

function unique(key: string, f: () => Promise<ImportResult>): Promise<ImportResult> {
  const p = enCours.get(key);
  if (p) return p;
  const n = f().finally(() => enCours.delete(key));
  enCours.set(key, n);
  return n;
}

/** Prépare en arrière-plan les quiz des prochains jours (sans bloquer la page). */
export function preparerEnArrierePlan(subjectId: string): void {
  if (!llmConfigured()) return;
  void unique(subjectId, async () => {
    const today = await todayParis(subjectId);
    return genererAvecIA(subjectId, { limit: CONFIG.LLM_JOURS_A_L_AVANCE, jusquA: addDays(today, CONFIG.LLM_JOURS_A_L_AVANCE - 1) });
  }).catch((e) => console.error("IA arrière-plan", subjectId, (e as Error).message));
}

/** Avant de lancer un quiz encore vide : tente l'IA pour ce jour (sinon le générateur simulé prendra le relais). */
export async function genererJourAvecIA(subjectId: string, dayId: string): Promise<void> {
  if (!llmConfigured()) return;
  try { await unique(subjectId, () => genererAvecIA(subjectId, { dayId, limit: 1 })); }
  catch (e) { console.error("IA jour", dayId, (e as Error).message); }
}

export { llmConfigured };
