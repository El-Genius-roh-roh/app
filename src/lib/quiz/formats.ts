// Jeu du jour (D46) : chaque matière a un jeu du jour qui change chaque jour par roulement (QCM, Memory, Mort subite,
// Relier), toujours sur les questions du jour. Fonctions pures, testées dans formats.test.ts. Le format est choisi au
// début de la tentative et gardé dans `attempts.format` : la correction reste juste même si la rotation change.
import { DEFI } from "@/config/constants";
import type { IconName } from "@/components/Icon";
import type { Critere } from "../scoring";

/** « vf » (Vrai ou faux) ne fait plus partie du roulement mais reste lisible pour les anciennes tentatives. */
export type Format = (typeof DEFI.FORMATS)[number] | "vf";

export const FORMATS: Record<Format, { titre: string; consigne: string; classement: string; icone: IconName }> = {
  qcm: { titre: "QCM", consigne: "Une question, plusieurs réponses : choisis la bonne.", classement: "Classement : d'abord les erreurs, puis le temps.", icone: "target" },
  memory: { titre: "Memory", consigne: "Les questions du jour et leurs réponses sont cachées : retrouve chaque paire en retournant deux cartes.", classement: "Classement : au temps. Chaque erreur te fait perdre du temps.", icone: "cards" },
  mort_subite: { titre: "Mort subite", consigne: "Des QCM à la suite : à la première erreur, c'est fini.", classement: "Classement : la plus longue série, puis le temps.", icone: "flame" },
  relier: { titre: "Relier", consigne: "Relie chaque question à sa réponse, piochée dans la liste. Une réponse utilisée ne revient pas.", classement: "Classement : d'abord les erreurs, puis le temps.", icone: "share" },
  vf: { titre: "Vrai ou faux", consigne: "Une question et une réponse proposée : est-ce la bonne ?", classement: "Classement : d'abord les erreurs, puis le temps.", icone: "check" },
};

/** Critère du classement du jour : le Memory se joue au temps (toutes les paires sont trouvées), les autres aux erreurs puis au temps. */
export const critereDe = (f: Format): Critere => (f === "memory" ? "temps" : "erreurs");

/**
 * Score affiché d'une partie terminée : bonnes réponses (QCM, Relier), longueur de la série (Mort subite, où
 * `erreurs` = questions non réussies), ou coups ratés (Memory).
 */
export function resultatTexte(f: Format, erreurs: number, total: number): string {
  if (f === "memory") return erreurs === 0 ? "sans faute" : `${erreurs} raté${erreurs > 1 ? "s" : ""}`;
  if (f === "mort_subite") return `série de ${total - erreurs}`;
  return `${total - erreurs}/${total}`;
}

/** Numéro du jour (jours depuis le 1er janvier 1970) d'une date « AAAA-MM-JJ ». */
export function numeroDuJour(date: string): number {
  const [a, m, j] = date.split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, j) / 86_400_000);
}

/** Décalage du roulement propre à une matière (hachage stable de son identifiant). */
function decalage(subjectId: string): number {
  let h = 2166136261;
  for (let i = 0; i < subjectId.length; i++) { h ^= subjectId.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Jeu du jour d'une matière à une date de jeu : le roulement avance d'un cran chaque jour, décalé selon la matière
 * (D50) pour que, le même jour, toutes les matières n'aient pas le même jeu. Avant DEFI.DECALAGE_DEPUIS, roulement
 * commun à toutes les matières (les jeux déjà joués gardent leur jeu).
 */
export function formatDuJour(date: string, subjectId: string): Format {
  const r = DEFI.FORMATS;
  const d = date >= DEFI.DECALAGE_DEPUIS ? decalage(subjectId) % r.length : 0;
  return r[(((numeroDuJour(date) + d) % r.length) + r.length) % r.length];
}

/** Relier a besoin d'au moins deux QCM, le Memory de DEFI.MEMORY_MIN_PAIRES paires : sinon on retombe sur le QCM. */
export const formatJouable = (f: Format, nbQcm: number, nbPaires = nbQcm): Format =>
  (f === "relier" && nbQcm < 2) || (f === "memory" && nbPaires < DEFI.MEMORY_MIN_PAIRES) ? "qcm" : f;

/** Vrai ou faux : la réponse proposée, la bonne une fois sur deux, sinon un des autres choix au hasard. */
export function propositionVF(nbChoix: number, correct: number, rand: () => number): number {
  if (nbChoix < 2 || rand() < 0.5) return correct;
  const autres = Array.from({ length: nbChoix }, (_, i) => i).filter((i) => i !== correct);
  return autres[Math.floor(rand() * autres.length)];
}

/** Vrai ou faux : la réponse du joueur (0 = vrai, 1 = faux) est-elle juste ? */
export const vfJuste = (choix: number, proposition: number, correct: number) => (choix === 0) === (proposition === correct);

const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

/** Relier : réponses encore disponibles, dans l'ordre tiré au début (celles des questions déjà jouées sont retirées). */
export const reserveRelier = (pool: string[], jouees: Set<string>) => pool.filter((id) => !jouees.has(id));

/** Relier : la réponse choisie est juste si son texte est celui de la bonne réponse (deux questions peuvent avoir la même). */
export const relierJuste = (choisie: string, bonne: string) => norm(choisie) === norm(bonne);

/* ------------------------------------------------------------------ Memory du jour */

/** Carte du Memory du jour, gardée dans `attempts.reserve` : « <id question>:q » (énoncé) ou « <id question>:r » (réponse). */
export type CleCarte = `${string}:${"q" | "r"}`;

/** Paquet mélangé : deux cartes par question (son énoncé et sa bonne réponse). */
export function paquetMemory(ids: string[], rand: () => number): CleCarte[] {
  const a: CleCarte[] = ids.flatMap((id) => [`${id}:q`, `${id}:r`] as CleCarte[]);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const carteDe = (cle: string) => { const i = cle.lastIndexOf(":"); return { id: cle.slice(0, i), face: cle.slice(i + 1) as "q" | "r" }; };

/** Deux cartes du paquet forment une paire : même question, une face énoncé et une face réponse. */
export function memePaire(paquet: string[], a: number, b: number): string | null {
  if (a === b || !paquet[a] || !paquet[b]) return null;
  const x = carteDe(paquet[a]), y = carteDe(paquet[b]);
  return x.id === y.id && x.face !== y.face ? x.id : null;
}
