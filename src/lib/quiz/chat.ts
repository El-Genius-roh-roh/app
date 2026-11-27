// GÉNÉRATION PAR LE CHAT (sans clé API) : l'app fabrique un prompt, on le colle dans Claude,
// puis on recolle la réponse JSON. Les questions sont validées puis complétées par le générateur simulé si besoin.
import { z } from "zod";
import { CONFIG } from "@/config/constants";
import { q } from "../db";
import { todayParis } from "../clock";
import { ensureQuestions, loadDayContext, type GenReport } from "./service";
import type { GenQuestion, SrcPage } from "./generate";

/** Référence stable d'une slide dans le prompt : C<n° du cours>-p<page>, ex. « C1-p12 ». */
type RefPage = SrcPage & { ordre: number };
const ref = (p: RefPage) => `C${p.ordre}-p${p.numero}`;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + " […]" : s);

async function withOrdre(pages: SrcPage[]): Promise<RefPage[]> {
  if (!pages.length) return [];
  const docs = new Map((await q<{ id: string; ordre: number }>("select id,ordre from documents where id = any($1)", [[...new Set(pages.map((p) => p.document_id))]])).map((d) => [d.id, d.ordre]));
  return pages.map((p) => ({ ...p, ordre: docs.get(p.document_id) ?? 0 }));
}

export type PromptOptions = {
  /** Nombre de jours max dans le prompt. */
  limit?: number;
  /** Inclure aussi les jours déjà générés, tant que personne n'a commencé le quiz (pour les refaire). */
  regenerer?: boolean;
  /** Un seul jour précis. */
  dayId?: string;
  /** Ne pas dépasser cette date (AAAA-MM-JJ). */
  jusquA?: string;
  /** Jours à ignorer (déjà traités). */
  exclure?: string[];
  /** Génération par l'IA : délai maximal de chaque appel (secondes). Par défaut CONFIG.LLM_TIMEOUT_S. */
  timeoutS?: number;
};

/** Prochains jours (à partir d'aujourd'hui) encore sans questions, ou à refaire. */
async function pendingDays(subjectId: string, o: PromptOptions = {}) {
  return q<{ id: string; subject_id: string; saison: number; jour_dans_saison: number; statut_generation: string; date: string }>(
    `select id, subject_id, saison, jour_dans_saison, statut_generation, to_char(date,'YYYY-MM-DD') as date
       from game_days g where subject_id=$1 and date >= $2::date - $8::int -- jours passés encore rattrapables (D29)
        and ($4::uuid is null or id=$4::uuid) and ($6::date is null or date <= $6::date) and not (id = any($7::uuid[]))
        and (statut_generation<>'ok' or ($5 and not exists (select 1 from attempts a where a.game_day_id=g.id)))
      order by date limit $3`,
    [subjectId, await todayParis(subjectId), o.limit ?? CONFIG.CHAT_JOURS_PAR_LOT, o.dayId ?? null, !!o.regenerer, o.jusquA ?? null, o.exclure ?? [], CONFIG.RATTRAPAGE_JOURS]);
}

export async function buildChatPrompt(subjectId: string, o: PromptOptions = {}): Promise<{ prompt: string; dates: string[]; ids: string[] } | null> {
  const days = await pendingDays(subjectId, o);
  if (!days.length) return null;
  const [s] = await q<{ nom: string }>("select nom from subjects where id=$1", [subjectId]);
  const annales = await q<{ nom: string; t: string }>(
    `select d.nom, string_agg(p.texte, E'\\n' order by p.numero) as t from documents d join document_pages p on p.document_id=d.id
      where d.subject_id=$1 and d.categorie='annale' and d.statut='pret' group by d.id, d.nom order by d.created_at`, [subjectId]);

  // Vue d'ensemble de TOUTE la matière (pas seulement les slides du jour) : l'IA situe chaque slide dans le sujet global
  // et juge ce qui est central ou accessoire.
  const plan = await q<{ nom: string; notions: string }>(
    `select d.nom, string_agg(distinct coalesce(nullif(p.chapitre,''), nullif(p.notions->>0,'')), ' ; ') as notions
       from documents d join document_pages p on p.document_id=d.id
      where d.subject_id=$1 and d.categorie='cours' and d.statut='pret' group by d.id, d.nom, d.ordre order by d.ordre`, [subjectId]);
  const planTxt = clip(plan.map((d) => `- ${d.nom}${d.notions ? ` : ${d.notions}` : ""}`).join("\n"), CONFIG.CHAT_PLAN_MAX_CARACTERES);

  const slides = new Map<string, RefPage>();
  const blocks: string[] = [];
  const cq = <T,>(text: string, params: unknown[] = []) => q<T>(text, params);
  for (const d of days) {
    const ctx = await loadDayContext(cq, d);
    const neuves = await withOrdre(ctx.today);
    const revision = await withOrdre(ctx.revSource.slice(0, CONFIG.CHAT_SLIDES_REVISION));
    for (const p of [...neuves, ...revision]) slides.set(ref(p), p);
    blocks.push([
      `### Jour du ${d.date}`,
      ctx.nNew ? `- ${ctx.nNew} questions "new" sur les slides : ${neuves.map(ref).join(", ")}` : "",
      ctx.nRev ? `- ${ctx.nRev} questions "revision" sur les slides : ${revision.map(ref).join(", ")}` : "",
    ].filter(Boolean).join("\n"));
  }

  const annalesTxt = clip(annales.map((a) => `--- ${a.nom}\n${a.t}`).join("\n\n"), CONFIG.CHAT_ANNALES_MAX_CARACTERES);
  const prompt = `Tu es professeur en « ${s.nom} ». Rédige les quiz quotidiens de révision de mes étudiants, à partir des slides ci-dessous.

## D'abord, comprends la matière
Avant d'écrire, lis le plan de la matière et les slides pour comprendre le SUJET GLOBAL : de quoi parle « ${s.nom} », quelles sont ses notions centrales, et ce que chaque slide apporte à ce sujet. Résume-le en une phrase dans le champ "sujet" de ta réponse.
${planTxt ? `\nPlan de la matière (tous les cours) :\n${planTxt}\n` : ""}
## Quiz à produire (${CONFIG.QUESTIONS_PAR_JOUR} questions par jour)
${blocks.join("\n\n")}

## Règles
- Environ ${Math.round(CONFIG.RATIO_QCM * 100)} % de QCM (4 choix, une seule bonne réponse) et le reste en vrai/faux.
- Chaque question porte uniquement sur le contenu des slides indiquées ; la bonne réponse doit s'y trouver sans ambiguïté.
- Interroge uniquement sur la MATIÈRE (notions, définitions, propriétés, méthodes, résultats). Ignore tout ce qui est hors matière : enseignant, contacts, organisation du cours, planning, modalités d'examen, bibliographie, plan, remerciements. Si une slide indiquée ne contient que ce genre d'informations, prends une autre slide de la liste.
- Les EXEMPLES du cours servent à comprendre une méthode : ne pose jamais de question sur leurs données précises (valeurs, noms, chiffres, résultats de l'exemple). Fais plutôt une question d'APPLICATION : la même méthode avec de nouvelles valeurs ou une nouvelle situation, ou « quelle méthode / quelle formule utiliser », « que signifie ce résultat ».
- PERTINENCE : chaque question teste une notion importante de « ${s.nom} », du genre de ce qu'un examen de cette matière pourrait demander. Écarte les détails accessoires d'une slide (anecdote, historique, digression, illustration).
- TEST DE L'INTERNET : une personne qui connaît la matière mais qui n'a PAS lu ce cours doit pouvoir répondre, par exemple en cherchant sur internet ou dans un manuel. Donc :
  - l'énoncé est autonome et donne tout le contexte utile ; jamais « selon le cours », « dans la slide », « dans l'exemple vu en cours », « d'après le professeur » ;
  - pas de notation, d'abréviation ou de convention propre au cours sans la définir dans l'énoncé ;
  - pas de question sur un exemple précis, un jeu de données, une étude de cas, une citation, un nom propre ou une date cités seulement pour illustrer ;
  - la bonne réponse est celle qu'on trouve dans les références usuelles de la matière, pas une formulation propre au cours.
- Privilégie la compréhension et l'application plutôt que le par-cœur mot pour mot.
- Écris TOUTES les formules, variables et symboles mathématiques en LaTeX entre dollars : $\\hat{\\beta} = (X^\\top X)^{-1} X^\\top y$, $\\alpha = 5\\,\\%$, $n \\geq 30$. Cela vaut pour l'énoncé, les choix et l'explication. Dans le JSON, double chaque antislash (\\\\frac, \\\\beta…).
- Chaque choix fait au plus une phrase courte (moins de 150 caractères), écrite en entier.
- Un QCM a TOUJOURS exactement 4 choix, tous différents. Si tu ne trouves pas 4 choix crédibles, fais plutôt un vrai/faux.
- Distracteurs plausibles, de longueur comparable à la bonne réponse. Pas de « toutes les réponses ».
- Explication courte (1 à 2 phrases) qui justifie la bonne réponse.
- Pas deux questions identiques, y compris d'un jour à l'autre.${annales.length ? "\n- Inspire-toi du style et du niveau des annales fournies." : ""}

## Format de réponse
Réponds UNIQUEMENT avec un JSON valide, sans texte autour :
{"sujet":"…","jours":[{"date":"AAAA-MM-JJ","questions":[{"type":"qcm","kind":"new","enonce":"…","choix":["…","…","…","…"],"bonne_reponse":0,"explication":"…","slides":["C1-p3"]}]}]}
- "sujet" : une phrase qui résume le sujet global de la matière.
- "type" : "qcm" ou "vrai_faux" (pour vrai_faux, "choix" vaut ["Vrai","Faux"] et "bonne_reponse" vaut 0 pour Vrai, 1 pour Faux).
- "bonne_reponse" : index (à partir de 0) du bon choix.
- "slides" : références des slides utilisées.

## Slides
${[...slides.entries()].map(([r, p]) => `[${r}]\n${clip(p.texte.trim(), CONFIG.CHAT_SLIDE_MAX_CARACTERES)}`).join("\n\n")}
${annales.length ? `\n## Annales (exemples de style)\n${annalesTxt}` : ""}`;
  return { prompt, dates: days.map((d) => d.date), ids: days.map((d) => d.id) };
}

const QuestionSchema = z.object({
  type: z.enum(["qcm", "vrai_faux"]),
  kind: z.enum(["new", "revision"]).catch("new"),
  enonce: z.string().min(3),
  choix: z.array(z.coerce.string()).optional(),
  bonne_reponse: z.coerce.number().int(),
  explication: z.string().catch(""),
  slides: z.array(z.string()).catch([]),
});
const AnswerSchema = z.object({ sujet: z.string().catch(""), jours: z.array(z.object({ date: z.string(), questions: z.array(z.unknown()) })) });

export type ImportResult = { date: string; report?: GenReport; erreur?: string }[];

/** Commandes LaTeX qui commencent par une lettre d'échappement JSON (\n, \t, \r, \b, \f) : « \neq » n'est pas « saut de ligne + eq ». */
const LATEX_AMBIGU = /^(n(e|eq|u|abla|eg|ot|otin|i|ewline|leq|geq|subseteq)|t(imes|au|heta|o|ext[a-z]*|ilde|op|herefore|frac|riangle[a-z]*|anh?|extstyle)|r(ho|ight[a-z]*|angle|m|vert|ceil|floor)|b(eta|ar|inom|f|ig[a-z]*|oldsymbol|ullet|ackslash|egin|ot|mod|eta)|f(rac|orall|lat|ootnotesize))$/;

/**
 * Répare les antislashs LaTeX non doublés dans un JSON (« \frac » au lieu de « \\frac ») :
 * - antislash suivi d'un mot : commande LaTeX, sauf un vrai échappement JSON suivi de texte (« \nLigne ») ;
 * - antislash suivi d'un caractère qui n'est pas un échappement JSON valide (« \( », « \{ », « \, »…).
 * Les vrais échappements JSON (\n, \t, \", \\, \uXXXX) sont conservés.
 */
export function fixLatexEscapes(json: string): string {
  return json.replace(/\\(\\|u[0-9a-fA-F]{4}|[a-zA-Z]+|.)/g, (m, x: string) => {
    if (x === "\\" || /^u[0-9a-fA-F]{4}$/.test(x)) return m;
    const echappementJson = /^["/bfnrt]/.test(x);
    if (!echappementJson) return "\\\\" + x; // \alpha, \(, \{, \, …
    if (x.length >= 2 && LATEX_AMBIGU.test(x)) return "\\\\" + x; // \frac, \neq, \times…
    return m; // \n, \t, \" … suivis éventuellement de texte
  });
}

/** Extrait le JSON d'une réponse du chat (accepte les blocs ```json, le texte autour et le LaTeX mal échappé). */
export function extractJson(text: string): unknown {
  const t = text.replace(/```(?:json)?/gi, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("Aucun JSON trouvé dans la réponse.");
  const raw = t.slice(a, b + 1);
  // toujours réparer : « \frac » passerait JSON.parse sans erreur mais deviendrait un saut de page + « rac »
  return JSON.parse(fixLatexEscapes(raw));
}

/**
 * Vérificateur indépendant : renvoie, pour chaque question, l'index de la réponse qu'il juge correcte, null (ambiguë),
 * ou "hors_sujet" (question qui ne porte pas sur la matière, ou à laquelle on ne peut pas répondre sans avoir lu le cours).
 */
export type AvisCorrecteur = number | null | "hors_sujet";
export type Verifier = (qs: { type: string; enonce: string; choix: string[] }[], ctx: { matiere: string; sujet: string }) => Promise<AvisCorrecteur[]>;

export async function importChatAnswer(subjectId: string, text: string, opts: { verifier?: Verifier } = {}): Promise<ImportResult> {
  let parsed;
  try { parsed = AnswerSchema.parse(extractJson(text)); }
  catch (e) { throw new Error(`Réponse illisible : ${(e as Error).message.slice(0, 200)}`); }

  const [{ nom: matiere } = { nom: "" }] = await q<{ nom: string }>("select nom from subjects where id=$1", [subjectId]);
  const pages = await withOrdre(await q<SrcPage>(
    `select p.id, p.document_id, p.numero, p.texte, coalesce(nullif(p.notions->>0,''), split_part(p.texte, E'\\n', 1)) as notion
       from document_pages p join documents d on d.id=p.document_id where d.subject_id=$1 and d.categorie='cours' and d.statut='pret'`, [subjectId]));
  const byRef = new Map(pages.map((p) => [ref(p).toLowerCase(), p]));

  const out: ImportResult = [];
  for (const jour of parsed.jours) {
    const [gd] = await q<{ id: string }>("select id from game_days where subject_id=$1 and date=$2::date", [subjectId, jour.date]);
    if (!gd) { out.push({ date: jour.date, erreur: "aucun quiz prévu à cette date" }); continue; }
    const rejets: string[] = [];
    const qs: GenQuestion[] = [];
    for (const raw of jour.questions) {
      const r = QuestionSchema.safeParse(raw);
      if (!r.success) { rejets.push("question mal formée"); continue; }
      const x = r.data;
      const src = x.slides.map((s) => byRef.get(s.trim().toLowerCase())).filter((p): p is RefPage => !!p);
      if (!src.length) { rejets.push(`« ${x.enonce.slice(0, 60)} » : slide source inconnue`); continue; }
      qs.push({
        type: x.type, kind: x.kind, enonce: x.enonce.trim(),
        choix: x.type === "vrai_faux" ? ["Vrai", "Faux"] : (x.choix ?? []).map((c) => c.trim()),
        correct_index: x.bonne_reponse, explication: x.explication.trim(),
        source: { document_id: src[0].document_id, pages: src.filter((p) => p.document_id === src[0].document_id).map((p) => p.numero), page_ids: src.map((p) => p.id) },
        notion: src[0].notion,
      });
    }
    // vérification indépendante (IA, docs/03 étape 6) : la question n'est gardée que si le correcteur, sans connaître
    // la réponse, retrouve exactement la même. Réponse différente, « null » (ambiguë / aucune bonne réponse) ou
    // absente = rejet. Si la vérification échoue, on n'enregistre RIEN de non vérifié pour ce jour.
    if (opts.verifier && qs.length) {
      let rep: AvisCorrecteur[];
      try {
        rep = await opts.verifier(qs.map((x) => ({ type: x.type, enonce: x.enonce, choix: x.choix })), { matiere, sujet: parsed.sujet });
      } catch (e) {
        out.push({ date: jour.date, erreur: `vérification impossible, quiz non enregistré : ${(e as Error).message.slice(0, 80)}` });
        continue;
      }
      for (let i = qs.length - 1; i >= 0; i--) {
        if (rep[i] === qs[i].correct_index) continue;
        const raison = rep[i] === "hors_sujet" ? "hors sujet ou impossible à résoudre sans le cours (jugé par le correcteur)"
          : rep[i] === null || rep[i] === undefined ? "jugée ambiguë par le correcteur" : "le correcteur trouve une autre réponse";
        rejets.push(`« ${qs[i].enonce.slice(0, 60)} » : ${raison}`);
        qs.splice(i, 1);
      }
    }
    try {
      const report = (await ensureQuestions(gd.id, qs))!;
      out.push({ date: jour.date, report: { ...report, rejets: [...rejets, ...report.rejets] } });
    } catch (e) {
      out.push({ date: jour.date, erreur: (e as Error).message });
    }
  }
  return out;
}
