// Logique pure du Memory (aucune dépendance serveur : utilisée aussi côté client pour « Rejouer »).

export type QuestionSource = { id: string; type: string; enonce: string; choix: string[]; correct_index: number };
export type Paire = { id: string; notion: string; definition: string };
export type Carte = { cle: string; paire: string; face: "notion" | "definition"; texte: string };

const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").replace(/[\s?…:.]+$/u, "").trim();

/**
 * Question → paire (énoncé ↔ bonne réponse). Ignore les vrai/faux, les textes trop longs, et toute paire dont
 * l'énoncé ou la réponse existe déjà : deux cartes identiques rendraient l'association ambiguë.
 */
export function paires(pool: QuestionSource[], max = { notion: Infinity, definition: Infinity }): Paire[] {
  const vus = new Set<string>();
  const out: Paire[] = [];
  for (const x of pool) {
    if (x.type !== "qcm") continue;
    const notion = x.enonce?.trim();
    const definition = x.choix?.[x.correct_index]?.trim();
    if (!notion || !definition) continue;
    if (notion.length > max.notion || definition.length > max.definition) continue;
    const a = norm(notion), b = norm(definition);
    if (a === b || vus.has(a) || vus.has(b)) continue;
    vus.add(a); vus.add(b);
    out.push({ id: x.id, notion, definition });
  }
  return out;
}

/** Notions du cours (D39) → paires « notion ↔ définition », ids préfixés « n: ». Mêmes règles de longueur et d’unicité. */
export function pairesNotions(notions: { id: string; terme: string; definition: string }[], max = { notion: Infinity, definition: Infinity }): Paire[] {
  return paires(notions.map((x) => ({ id: `n:${x.id}`, type: "qcm", enonce: x.terme, choix: [x.definition], correct_index: 0 })), max);
}

function melange<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Tire `n` paires au hasard et mélange leurs 2n cartes. */
export function distribuer(source: Paire[], n: number, rand: () => number): Carte[] {
  const choisies = melange(source, rand).slice(0, n);
  const cartes = choisies.flatMap((p): Carte[] => [
    { cle: `${p.id}:n`, paire: p.id, face: "notion", texte: p.notion },
    { cle: `${p.id}:d`, paire: p.id, face: "definition", texte: p.definition },
  ]);
  return melange(cartes, rand);
}

/** Deux cartes retournées vont ensemble : même paire, faces différentes. */
export const vontEnsemble = (a: Carte, b: Carte) => a.paire === b.paire && a.face !== b.face;

/** Meilleur score : le moins de coups, puis le plus rapide. */
export type Score = { coups: number; ms: number };
export const meilleur = (a: Score | null, b: Score) => (!a || b.coups < a.coups || (b.coups === a.coups && b.ms < a.ms) ? b : a);
