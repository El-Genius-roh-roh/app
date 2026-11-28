import { CONFIG } from "@/config/constants";

/** `retard` : jours de retard (rattrapage, 0 à CONFIG.RATTRAPAGE_JOURS) — ne change pas le rang, seulement les gemmes. */
export type Result = { userId: string; erreurs: number; dureeMs: number; retard?: number };
export type Ranked = Result & { rang: number; battus: number; base: number; points: number };

export function multiplicateur(jour: number): number {
  return 1 + CONFIG.BONUS_MULTIPLICATEUR_PAR_JOUR * (jour - 1);
}

/** Arrondi à l'entier le plus proche, .5 vers le haut (corrige les erreurs flottantes). */
export function arrondi(x: number): number {
  return Math.floor(Math.round(x * 1e6) / 1e6 + 0.5);
}

/** Critère du classement du jour (D46) : « erreurs » = erreurs puis temps ; « temps » = temps seul (Memory). */
export type Critere = "erreurs" | "temps";

const comparer = (c: Critere) => (a: Result, b: Result) =>
  c === "temps" ? a.dureeMs - b.dureeMs : a.erreurs - b.erreurs || a.dureeMs - b.dureeMs;

/** Part des gemmes conservée après `retard` jours de retard : 1 ; 0,9 ; 0,8 ; 0,7 (jamais négative). */
export function facteurRetard(retard = 0): number {
  return Math.max(0, 1 - CONFIG.PENALITE_RETARD_PAR_JOUR * Math.max(0, retard));
}

/**
 * Classement du jour : erreurs puis temps (ou temps seul, selon le jeu du jour) ; rang « 1, 2, 2, 4 ».
 * Gemmes (champ `points`) : (participation + 10 par joueur derrière) × multiplicateur du jour × pénalité de retard.
 */
export function classementDuJour(results: Result[], jour: number, critere: Critere = "erreurs"): Ranked[] {
  const m = multiplicateur(jour);
  const cmp = comparer(critere);
  const bat = (a: Result, b: Result) => cmp(a, b) < 0;
  return [...results]
    .sort(cmp)
    .map((r) => {
      const rang = 1 + results.filter((o) => bat(o, r)).length;
      const battus = results.filter((o) => bat(r, o)).length;
      const base = CONFIG.POINTS_PARTICIPATION + CONFIG.POINTS_PAR_JOUEUR_BATTU * battus;
      return { ...r, rang, battus, base, points: arrondi(base * m * facteurRetard(r.retard)) };
    });
}

export type Cumul = { userId: string; points: number; erreurs: number; dureeMs: number };
export type CumulRanked<T extends Cumul> = T & { rang: number };

/**
 * Classement de saison / général (docs/04 §5 et §6) : points décroissants ; égalité départagée par le
 * nombre total d'erreurs (croissant) puis le temps total (croissant). Rang « 1, 2, 2, 4 ».
 */
export function classementCumule<T extends Cumul>(rows: T[]): CumulRanked<T>[] {
  const meilleur = (a: Cumul, b: Cumul) =>
    a.points > b.points || (a.points === b.points && (a.erreurs < b.erreurs || (a.erreurs === b.erreurs && a.dureeMs < b.dureeMs)));
  return [...rows]
    .sort((a, b) => b.points - a.points || a.erreurs - b.erreurs || a.dureeMs - b.dureeMs)
    .map((r) => ({ ...r, rang: 1 + rows.filter((o) => meilleur(o, r)).length }));
}
