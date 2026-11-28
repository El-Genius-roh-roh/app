// Notions du cours (D39) : paires « concept ↔ définition » tirées des pages de cours. Fonctions pures, testées
// dans notions.test.ts. Deux sources : l'IA (si configurée), et à défaut une détection simple de motifs français.
import { NOTIONS } from "@/config/constants";

export type NotionBrute = { terme: string; definition: string; page: number | null };

/** Minuscules, sans accents ni ponctuation superflue : pour comparer des termes. */
export const normTerme = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' -]+/g, " ").replace(/\s+/g, " ").trim();

const ARTICLE = /^(?:l'|l’|le |la |les |un |une |des |du |de la |de l'|de l’)/i;
const sansArticle = (s: string) => s.replace(ARTICLE, "").trim();
// « p53 » : on ne touche pas à la casse d'un premier mot qui contient des chiffres
const majuscule = (s: string) => (/\d/.test(s.split(/\s/)[0]) ? s : s.charAt(0).toUpperCase() + s.slice(1));
const point = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);
// mots qui introduisent une étiquette de diapo, pas un concept (« Bilan net : 2 ATP »)
const ETIQUETTES = new Set(["exemple", "exemples", "remarque", "remarques", "attention", "note", "rappel", "bilan", "bilan net", "phases",
  "taille", "taille typique", "rendement", "objectif", "objectifs", "plan", "sommaire", "conclusion", "introduction", "question", "questions",
  "réponse", "solution", "exercice", "source", "sources", "théorème", "propriété", "propriétés", "corollaire", "lemme", "preuve", "démonstration", "notation", "notations", "cf", "nb"]);

function termeValide(t: string) {
  const mots = t.split(/\s+/);
  return t.length >= 2 && t.length <= NOTIONS.TERME_MAX && mots.length <= 5 && /\p{L}/u.test(t) && !/^\d/.test(t)
    && !ETIQUETTES.has(t.toLowerCase()) && !ETIQUETTES.has(mots[0].toLowerCase()) && !/[=<>≤≥∑∫]/.test(t);
}
function definitionValide(d: string, terme: string) {
  return d.length >= NOTIONS.DEFINITION_MIN && d.length <= NOTIONS.DEFINITION_MAX && d.split(/\s+/).length >= 3
    && normTerme(d) !== normTerme(terme);
}

/** Lignes d'une page, sans puces ni numéros de liste. */
const lignes = (texte: string) => texte.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-–•*▪●◦]|\d+[.)])\s*/, "").trim()).filter(Boolean);

/**
 * Détection sans IA. Motifs reconnus, ligne par ligne :
 * - « Terme : définition » (terme court, définition d'au moins 3 mots) ;
 * - « Le terme est / désigne / correspond à / se définit comme … » ;
 * - « On appelle terme … » ;
 * - un titre « Définition de X » / « Définition : X » suivi de sa première ligne.
 */
export function detecterDefinitions(pages: { numero: number; texte: string }[]): NotionBrute[] {
  const out: NotionBrute[] = [];
  const ajoute = (terme: string, definition: string, page: number) => {
    const t = sansArticle(terme.trim().replace(/[\s:–-]+$/, ""));
    const d = point(majuscule(definition.trim()));
    if (termeValide(t) && definitionValide(d, t)) out.push({ terme: majuscule(t), definition: d, page });
  };
  for (const p of pages) {
    const ls = lignes(p.texte ?? "");
    ls.forEach((l, i) => {
      let m: RegExpMatchArray | null;
      if ((m = l.match(/^d[ée]finitions?\s*(?:de |du |des |d['’]|:)\s*(.+?)\s*:?$/i)) && ls[i + 1]) return ajoute(m[1], ls[i + 1], p.numero);
      if ((m = l.match(/^([^:]{2,60}?)\s+:\s+(.+)$/))) return ajoute(m[1], m[2], p.numero);
      if ((m = l.match(/^on (?:appelle|nomme)\s+(.+?)\s+((?:une?|le|la|les|l['’]|tout|toute|ce|cette)\b.+)$/i))) return ajoute(m[1], m[2], p.numero);
      if ((m = l.match(/^((?:l['’]|le |la |les |un |une )?[\p{L}0-9'’ -]{2,50}?)\s+(?:est|sont|désigne|désignent|correspond à|se définit comme)\s+(.+)$/iu))) {
        // « L'ATP est la monnaie… » : le sujet doit être court (pas une phrase entière)
        if (m[1].split(/\s+/).length <= 4) ajoute(m[1], m[2], p.numero);
      }
    });
  }
  return dedoublonner(out);
}

/** Un terme ne figure qu'une fois (le premier rencontré). */
export function dedoublonner<T extends { terme: string }>(xs: T[]): T[] {
  const vus = new Set<string>();
  return xs.filter((x) => { const k = normTerme(x.terme); if (!k || vus.has(k)) return false; vus.add(k); return true; });
}

/**
 * Réponse de l'IA → notions. Accepte un tableau JSON nu ou entouré de texte, de balises ```json ou <think>, avec des
 * crochets parasites avant le tableau (« [page 3] ») et du LaTeX mal échappé (« \frac »). Lève une erreur si rien n'est lisible.
 */
export function lireReponseIA(texte: string): NotionBrute[] {
  const t = texte.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/gi, "");
  const fin = t.lastIndexOf("]");
  // le tableau commence au premier « [ » suivi d'un objet (ou vide) : on essaie chaque candidat
  for (let i = t.indexOf("["); i >= 0 && i < fin; i = t.indexOf("[", i + 1)) {
    if (!/^\[\s*[{\]]/.test(t.slice(i))) continue;
    const brut = t.slice(i, fin + 1);
    for (const essai of [brut, brut.replace(/\\(?!["\\/bfnrtu])/g, "\\\\")]) {
      try {
        const v = JSON.parse(essai);
        if (!Array.isArray(v)) continue;
        return v.filter((x) => x && typeof x.terme === "string" && typeof x.definition === "string")
          .map((x) => ({ terme: x.terme.trim(), definition: x.definition.trim(), page: Number.isInteger(x.page) ? x.page : null }));
      } catch { /* candidat suivant */ }
    }
  }
  throw new Error("Réponse de l'IA illisible (pas de tableau JSON).");
}

/**
 * Garde-fou contre les inventions de l'IA : on ne garde une notion que si son terme apparaît (sans accents ni casse)
 * dans le texte de la page citée (ou du lot de pages si la page manque), avec une définition de longueur raisonnable.
 */
export function ancrer(items: NotionBrute[], pages: { numero: number; texte: string }[]): NotionBrute[] {
  const textes = new Map(pages.map((p) => [p.numero, normTerme(p.texte ?? "")]));
  const tout = [...textes.values()].join(" ");
  return dedoublonner(items.filter((x) => {
    const t = normTerme(x.terme);
    if (!termeValide(x.terme) || !definitionValide(x.definition, x.terme) || !t) return false;
    const source = x.page !== null && textes.has(x.page) ? textes.get(x.page)! : tout;
    return source.includes(t);
  }).map((x) => ({ ...x, terme: majuscule(x.terme), definition: point(majuscule(x.definition)) })));
}

/** Consigne envoyée à l'IA pour un lot de pages. */
export function promptNotions(matiere: string, pages: { numero: number; texte: string }[]): string {
  return [
    `Voici des pages d'un cours de « ${matiere} ». Relève les notions et concepts importants que ces pages DÉFINISSENT ou expliquent.`,
    `Pour chacun, donne le terme exact tel qu'il apparaît dans le texte et une définition courte (une phrase, ${NOTIONS.DEFINITION_IA} caractères au plus), fidèle au cours, compréhensible seule.`,
    "N'invente rien : uniquement ce que le texte dit. Pas de titres de diapo, pas d'exemples chiffrés, pas de formules seules.",
    'Réponds uniquement par un tableau JSON : [{"terme": "...", "definition": "...", "page": numéro}]. Tableau vide s\'il n\'y a aucune définition.',
    "",
    ...pages.map((p) => `--- Page ${p.numero} ---\n${(p.texte ?? "").slice(0, NOTIONS.PAGE_MAX_CARACTERES)}`),
  ].join("\n");
}
