// Logique pure des flashcards (aucune dépendance serveur : utilisée aussi côté client).
// Les cartes viennent des questions vérifiées des jours passés : recto = l'énoncé, verso = la bonne réponse + l'explication.

export type FlashSource = { id: string; type: string; enonce: string; choix: string[]; correct_index: number; explication: string };
export type Flashcard = { id: string; recto: string; verso: string; explication: string; vf: boolean };

/** Boîtes de Leitner (1 = à revoir souvent … BOITE_MAX = acquise), gardées dans le navigateur. */
export type Boites = Record<string, number>;
export const BOITE_MAX = 3;

const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

/** Questions → cartes. Garde les QCM et les vrai/faux ; ignore les doublons d'énoncé et les cartes sans réponse. */
export function cartes(pool: FlashSource[]): Flashcard[] {
  const vus = new Set<string>();
  const out: Flashcard[] = [];
  for (const x of pool) {
    const recto = x.enonce?.trim();
    if (!recto) continue;
    const vf = x.type === "vrai_faux";
    const verso = (x.choix?.[x.correct_index]?.trim() || (vf ? (x.correct_index === 0 ? "Vrai" : "Faux") : "")).trim();
    if (!verso) continue;
    const k = norm(recto);
    if (vus.has(k)) continue;
    vus.add(k);
    out.push({ id: x.id, recto, verso, explication: x.explication?.trim() ?? "", vf });
  }
  return out;
}

const boite = (b: Boites, id: string) => Math.min(BOITE_MAX, Math.max(1, b[id] ?? 1));

/** Paquet de `n` cartes : d'abord celles des petites boîtes (les moins sues), au hasard dans chaque boîte. */
export function paquet(source: Flashcard[], boites: Boites, n: number, rand: () => number): Flashcard[] {
  return source
    .map((c) => ({ c, k: boite(boites, c.id) + rand() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.c);
}

/** Je savais : la carte monte d'une boîte. À revoir : elle retourne en boîte 1. */
export function classer(boites: Boites, id: string, savais: boolean): Boites {
  return { ...boites, [id]: savais ? Math.min(BOITE_MAX, boite(boites, id) + 1) : 1 };
}

/** Session : la file des cartes à voir ; une carte « à revoir » repasse en fin de file jusqu'à être sue. */
export type Session = { file: string[]; sues: string[]; ratees: string[] };
export const nouvelleSession = (ids: string[]): Session => ({ file: [...ids], sues: [], ratees: [] });

export function repondre(s: Session, savais: boolean): Session {
  const [id, ...reste] = s.file;
  if (id === undefined) return s;
  if (savais) return { ...s, file: reste, sues: s.sues.includes(id) ? s.sues : [...s.sues, id] };
  return { ...s, file: [...reste, id], ratees: s.ratees.includes(id) ? s.ratees : [...s.ratees, id] };
}

/** Nombre de cartes acquises (boîte maximale) parmi `source`. */
export const acquises = (source: Flashcard[], boites: Boites) => source.filter((c) => boite(boites, c.id) === BOITE_MAX).length;
