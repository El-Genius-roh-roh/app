// GÉNÉRATION AUTOMATIQUE PAR L'IA (docs/03) : le même prompt que la génération « par le chat »,
// mais envoyé directement au modèle, puis une seconde passe indépendante vérifie chaque réponse.
import { CONFIG } from "@/config/constants";
import { chatLLM, llmConfigured } from "../ai/llm";
import { addDays, todayParis } from "../clock";
import { buildChatPrompt, extractJson, importChatAnswer, type ImportResult, type PromptOptions, type Verifier } from "./chat";

const SYSTEME = "Tu es un professeur rigoureux qui rédige des quiz de révision en français. Tu réponds uniquement avec du JSON valide, sans texte autour.";

/**
 * Seconde passe : un correcteur qui n'a PAS le cours (ni la bonne réponse) répond aux questions, comme le ferait
 * quelqu'un qui connaît la matière ou cherche sur internet. Il signale aussi les questions hors sujet ou qui
 * dépendent du cours (exemple précis, notation maison, « selon le cours »…) : elles sont rejetées.
 */
export const verifierIA = (timeoutS?: number): Verifier => async (qs, ctx) => {
  const liste = qs.map((x, i) => `${i + 1}. ${x.enonce}\n${x.choix.map((c, j) => `   ${j}) ${c}`).join("\n")}`).join("\n\n");
  const txt = await chatLLM([
    { role: "system", content: SYSTEME },
    { role: "user", content: `Matière : « ${ctx.matiere} »${ctx.sujet ? ` (${ctx.sujet})` : ""}.
Tu n'as PAS le cours sous les yeux : réponds avec tes connaissances générales de la matière, comme quelqu'un qui chercherait sur internet ou dans un manuel.

Pour chaque question :
- si elle ne porte pas sur une notion de la matière (organisation du cours, anecdote, détail accessoire), ou si on ne peut pas y répondre sans avoir lu CE cours précis (exemple ou données du cours, notation non définie, « selon le cours »…), réponds "hors_sujet" ;
- sinon, donne l'index (à partir de 0) du choix correct, ou null si aucune réponse n'est correcte ou si plusieurs le sont.

${liste}

Réponds uniquement : {"reponses":[0,"hors_sujet",2,null,...]} (une valeur par question, dans l'ordre).` },
  ], { maxTokens: 600, temperature: 0, timeoutS });
  const r = (extractJson(txt) as { reponses?: unknown[] }).reponses ?? [];
  return qs.map((_, i) => (typeof r[i] === "number" ? (r[i] as number) : r[i] === "hors_sujet" ? "hors_sujet" : null));
};

/** Génération + vérification. Avec `budgetS`, les deux appels réunis tiennent dans ce budget. */
async function unAppel(subjectId: string, prompt: string, budgetS?: number): Promise<ImportResult> {
  const t0 = Date.now();
  const txt = await chatLLM([{ role: "system", content: SYSTEME }, { role: "user", content: prompt }], { timeoutS: budgetS });
  const reste = budgetS === undefined ? undefined : Math.max(5, budgetS - (Date.now() - t0) / 1000);
  return importChatAnswer(subjectId, txt, { verifier: verifierIA(reste) });
}

/** Génère (ou refait) les quiz des prochains jours d'une matière avec l'IA. Un appel par jour. */
export async function genererAvecIA(subjectId: string, o: PromptOptions = {}): Promise<ImportResult> {
  const out: ImportResult = [];
  const max = o.limit ?? CONFIG.CHAT_JOURS_PAR_LOT;
  const faits: string[] = []; // jours déjà traités : on passe au suivant (sinon « refaire » reprendrait toujours le même)
  for (let i = 0; i < max; i++) {
    const p = await buildChatPrompt(subjectId, { ...o, exclure: faits, limit: CONFIG.LLM_JOURS_PAR_APPEL });
    if (!p) break;
    faits.push(...p.ids);
    try {
      let res = await unAppel(subjectId, p.prompt, o.timeoutS);
      // des questions de l'IA ont été écartées et complétées par le générateur simulé : un second essai, si personne
      // n'a joué (pas quand un joueur attend devant « Commencer » : o.timeoutS)
      if (o.timeoutS === undefined && res.some((r) => r.report && r.report.simulees > 0)) {
        const p2 = await buildChatPrompt(subjectId, { dayId: p.ids[0], regenerer: true, limit: 1 });
        if (p2) {
          const res2 = await unAppel(subjectId, p2.prompt).catch(() => null);
          if (res2 && !res2.every((r) => r.erreur)) res = res2; // c'est ce second essai qui est maintenant en base
        }
      }
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

// Dernière tentative de préparation par matière : la page d'une matière appelle preparerEnArrierePlan à chaque
// affichage ; sans ce frein, un service IA en panne serait relancé à chaque clic (coût, charge).
const derniereTentative = new Map<string, number>();

/** Prépare en arrière-plan les quiz des prochains jours (sans bloquer la page). */
export function preparerEnArrierePlan(subjectId: string): void {
  if (!llmConfigured()) return;
  const now = Date.now();
  if (now - (derniereTentative.get(subjectId) ?? 0) < CONFIG.LLM_PREPARATION_INTERVALLE_MIN * 60_000) return;
  derniereTentative.set(subjectId, now);
  void unique(subjectId, async () => {
    const today = await todayParis(subjectId);
    return genererAvecIA(subjectId, { limit: CONFIG.LLM_JOURS_A_L_AVANCE, jusquA: addDays(today, CONFIG.LLM_JOURS_A_L_AVANCE - 1) });
  }).catch((e) => console.error("IA arrière-plan", subjectId, (e as Error).message));
}

/**
 * Avant de lancer un quiz encore vide : tente l'IA pour ce jour, mais le joueur n'attend jamais plus de
 * LLM_TIMEOUT_DEMARRAGE_S secondes ; au-delà, le générateur simulé prend le relais.
 */
export async function genererJourAvecIA(subjectId: string, dayId: string): Promise<void> {
  if (!llmConfigured()) return;
  const t = CONFIG.LLM_TIMEOUT_DEMARRAGE_S;
  try {
    const deja = enCours.get(subjectId);
    if (deja) {
      // une préparation tourne déjà (elle couvre sans doute ce jour) : on l'attend un peu, pas plus
      await Promise.race([deja, new Promise((r) => setTimeout(r, t * 1000))]);
    } else {
      // appel dédié, interrompu (AbortController) au bout du budget : il ne peut pas écrire après coup
      await unique(subjectId, () => genererAvecIA(subjectId, { dayId, limit: 1, timeoutS: t }));
    }
  } catch (e) { console.error("IA jour", dayId, (e as Error).message); }
}

export { llmConfigured };
