// GÉNÉRATION SIMULÉE (aucune clé API) des questions. Même contrat que docs/03 (format de sortie).
// Les questions sont construites à partir des faits (puces) des slides ; les distracteurs viennent d'AUTRES notions.
import { CONFIG } from "@/config/constants";
import { rng, shuffled } from "../rng";

export type SrcPage = { id: string; document_id: string; numero: number; texte: string; notion: string };
export type GenQuestion = {
  type: "qcm" | "vrai_faux";
  kind: "new" | "revision";
  enonce: string;
  choix: string[];
  correct_index: number;
  explication: string;
  source: { document_id: string; pages: number[]; page_ids: string[] };
  notion: string;
};

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const MAX_FACT = 140;

/** Clé d'unicité d'une question : énoncé + bonne réponse (deux QCM sur la même notion mais avec une autre bonne réponse sont distincts). */
export const qkey = (q: { enonce: string; choix: string[]; correct_index: number }) => `${q.enonce}||${q.choix[q.correct_index]}`;

export function factsOf(p: SrcPage): string[] {
  const lines = p.texte.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim());
  const facts = bullets.length ? bullets : lines.slice(1).filter((l) => l.length >= 30);
  return facts.map((f) => f.slice(0, MAX_FACT)).filter((f) => f.length >= 8);
}

export type GenOptions = {
  kind: "new" | "revision";
  count: number;
  pages: SrcPage[]; // pages dont on tire les questions, par ordre de priorité
  pool: SrcPage[]; // toutes les pages du cours (distracteurs)
  used: Set<string>; // clés (qkey) des questions déjà posées dans la saison
  seed: number;
  round: number; // numéro de tentative de génération (varie les faits choisis)
  typeOffset?: number;
};

export const MARQUE_VF = "Vrai ou faux : ";

/** Prépare une seule fois les faits du cours (texte + forme normalisée) : évite de tout recalculer à chaque question. */
function indexPool(pool: SrcPage[]) {
  const facts: { f: string; n: string; notion: string }[] = [];
  const seenN = new Set<string>();
  for (const p of pool) for (const f of factsOf(p)) {
    const n = norm(f);
    if (seenN.has(n)) continue; // un même fait n'est proposé qu'une fois comme distracteur
    seenN.add(n);
    facts.push({ f, n, notion: p.notion });
  }
  return facts;
}

export function generateQuestions(o: GenOptions): GenQuestion[] {
  const rand = rng(o.seed + o.round * 7919);
  const out: GenQuestion[] = [];
  const maxLayer = Math.max(0, ...o.pages.map((p) => factsOf(p).length));
  const seen = new Set<string>();
  const all = indexPool(o.pool);
  const order = new Int32Array(all.length);

  /** Jusqu'à 3 distracteurs tirés au hasard (mélange partiel de Fisher-Yates : on s'arrête dès qu'on en a 3). */
  const pickDistractors = (notion: string, srcNorm: string, factNorm: string): string[] => {
    for (let i = 0; i < order.length; i++) order[i] = i;
    const res: string[] = [];
    for (let i = 0; i < order.length && res.length < 3; i++) {
      const j = i + Math.floor(rand() * (order.length - i));
      const k = order[j]; order[j] = order[i]; order[i] = k;
      const c = all[k];
      if (c.notion !== notion && c.n !== factNorm && !srcNorm.includes(c.n)) res.push(c.f);
    }
    return res;
  };

  for (let layer = 0; layer < maxLayer && out.length < o.count; layer++) {
    for (const page of o.pages) {
      if (out.length >= o.count) break;
      const facts = factsOf(page);
      if (!facts.length) continue;
      const fact = facts[(layer + o.round) % facts.length];
      const key = page.id + "|" + fact;
      if (seen.has(key)) continue;
      seen.add(key);

      const distinct = pickDistractors(page.notion, norm(page.texte), norm(fact));
      const wantVF = ((o.typeOffset ?? 0) + out.length) % 5 === 4 || distinct.length < 3;
      if (distinct.length < 1) continue;
      const title = page.notion;
      const ref = `slide ${page.numero}`;
      const source = { document_id: page.document_id, pages: [page.numero], page_ids: [page.id] };
      let q: GenQuestion;
      if (wantVF) {
        const vrai = rand() < 0.5;
        const shown = vrai ? fact : distinct[0];
        q = {
          type: "vrai_faux", kind: o.kind,
          enonce: `${MARQUE_VF}« ${title} » : ${shown}`,
          choix: ["Vrai", "Faux"], correct_index: vrai ? 0 : 1,
          explication: vrai ? `Vrai (${ref}) : ${fact}` : `Faux. D'après la ${ref}, à propos de « ${title} » : ${fact}`,
          source, notion: title,
        };
      } else {
        const choices = shuffled([fact, ...distinct.slice(0, 3)], rand);
        q = {
          type: "qcm", kind: o.kind,
          enonce: `À propos de « ${title} », quelle affirmation est correcte ?`,
          choix: choices, correct_index: choices.indexOf(fact),
          explication: `Bonne réponse (${ref}, « ${title} ») : ${fact}`,
          source, notion: title,
        };
      }
      // l'énoncé d'un QCM ne varie que par le titre : on le rend unique en ajoutant la notion quand elle se répète
      // même notion deux fois le même jour (peu de slides) : on distingue les énoncés
      if (q.type === "qcm" && out.some((x) => x.enonce === q.enonce)) q.enonce = q.enonce.replace(/ \?$/, ` ? (point ${layer + 1})`);
      if (o.used.has(qkey(q)) || out.some((x) => qkey(x) === qkey(q))) continue;
      out.push(q);
    }
  }
  return out;
}

export function validateTechnical(q: GenQuestion, used: Set<string>): string | null {
  if (!q.enonce || q.enonce.length > 300) return "énoncé invalide";
  if (q.type === "qcm" && (q.choix.length !== 4 || new Set(q.choix.map(norm)).size !== 4)) return "4 choix distincts requis";
  if (q.type === "vrai_faux" && (q.choix.length !== 2 || q.choix[0] !== "Vrai" || q.choix[1] !== "Faux")) return "choix vrai/faux invalides";
  if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index >= q.choix.length) return "correct_index hors bornes";
  if (used.has(qkey(q))) return "doublon de question";
  return null;
}

export const QCM_PAR_JOUR_MIN = Math.round(CONFIG.QUESTIONS_PAR_JOUR * CONFIG.RATIO_QCM);
