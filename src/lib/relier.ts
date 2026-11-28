// Logique pure du jeu « Relier » (D40), sans dépendance serveur : utilisée aussi côté client pour « Rejouer ».
// Les paires viennent des mêmes sources que le Memory (notions du cours, sinon questions vérifiées des jours passés).
import type { Paire } from "./memory";

export type Case = { id: string; texte: string };
export type Donne = { termes: Case[]; definitions: Case[] };

function melange<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Tire `n` paires et mélange chaque colonne à part. Si le mélange laisse toutes les définitions en face de leur
 * terme, on décale d'un cran (sinon il n'y aurait rien à chercher).
 */
export function donne(source: Paire[], n: number, rand: () => number): Donne {
  const choisies = melange(source, rand).slice(0, n);
  const termes = choisies.map((p) => ({ id: p.id, texte: p.notion }));
  let definitions = melange(choisies.map((p) => ({ id: p.id, texte: p.definition })), rand);
  if (definitions.length > 1 && definitions.every((d, i) => d.id === termes[i].id)) definitions = [...definitions.slice(1), definitions[0]];
  return { termes, definitions };
}

/** Un terme et une définition vont ensemble : même paire. */
export const relies = (terme: string, definition: string) => terme === definition;
