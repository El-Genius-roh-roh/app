// Défi du jour (D41) : le quiz du jour change de format chaque jour (QCM, Relier, Vrai ou faux), sur les questions du
// jour. Fonctions pures, testées dans formats.test.ts. Le format est choisi au début de la tentative et gardé dans
// `attempts.format` : la correction reste juste même si la rotation change.
import { DEFI } from "@/config/constants";
import type { IconName } from "@/components/Icon";

export type Format = (typeof DEFI.FORMATS)[number];

export const FORMATS: Record<Format, { titre: string; consigne: string; icone: IconName }> = {
  qcm: { titre: "QCM", consigne: "Une question, plusieurs réponses : choisis la bonne.", icone: "target" },
  relier: { titre: "Relier", consigne: "Relie chaque question à sa réponse, piochée dans la liste. Une réponse utilisée ne revient pas.", icone: "share" },
  vf: { titre: "Vrai ou faux", consigne: "Une question et une réponse proposée : est-ce la bonne ?", icone: "check" },
};

/** Numéro du jour (jours depuis le 1er janvier 1970) d'une date « AAAA-MM-JJ ». */
export function numeroDuJour(date: string): number {
  const [a, m, j] = date.split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, j) / 86_400_000);
}

/** Format du défi d'une date de jeu : la rotation avance d'un cran chaque jour. */
export function formatDuJour(date: string): Format {
  const r = DEFI.FORMATS;
  return r[((numeroDuJour(date) % r.length) + r.length) % r.length];
}

/** Relier a besoin d'au moins deux QCM (sinon il n'y a rien à relier) : on retombe sur le QCM. */
export const formatJouable = (f: Format, nbQcm: number): Format => (f === "relier" && nbQcm < 2 ? "qcm" : f);

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
