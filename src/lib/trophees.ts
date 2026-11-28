// TROPHÉES (semaine), LIGUES (mois) ET BADGES (docs/04 §8) : fonctions pures, testées dans trophees.test.ts.
import { CONFIG, LIGUES, TROPHEES } from "@/config/constants";

export type Ligue = (typeof LIGUES)[number];
export type LigueInfo = {
  ligue: Ligue;
  index: number;
  suivante: Ligue | null;
  /** Progression vers la ligue suivante, de 0 à 1 (1 si ligue maximale). */
  progression: number;
  /** Points qui manquent pour la ligue suivante (0 si ligue maximale). */
  manque: number;
};

export function ligueDe(trophees: number): LigueInfo {
  const points = trophees;
  let index = 0;
  for (let i = 0; i < LIGUES.length; i++) if (points >= LIGUES[i].min) index = i;
  const ligue = LIGUES[index];
  const suivante = LIGUES[index + 1] ?? null;
  if (!suivante) return { ligue, index, suivante, progression: 1, manque: 0 };
  return {
    ligue, index, suivante,
    progression: Math.min(1, Math.max(0, (points - ligue.min) / (suivante.min - ligue.min))),
    manque: suivante.min - points,
  };
}

/** Un résultat quotidien (une matière, un jour, un joueur). `date` au format AAAA-MM-JJ. */
export type Resultat = { dayId: string; date: string; userId: string; rang: number; erreurs: number; dureeMs: number };

export type Trophee = {
  id: string;
  nom: string;
  description: string;
  /** Nombre de fois gagné (trophées cumulables) ou 1/0 (trophées à débloquer une fois). */
  nombre: number;
  cumulable: boolean;
};

export type Vitrine = { trophees: Trophee[]; serieActuelle: number; serieMax: number; quizJoues: number };

const jourSuivant = (d: string) => {
  const t = new Date(d + "T12:00:00Z");
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
};

/** Séries de jours consécutifs : la plus longue, et celle en cours (qui se termine aujourd'hui ou hier). */
export function series(dates: string[], today: string): { max: number; actuelle: number } {
  const jours = [...new Set(dates)].filter((d) => d <= today).sort();
  let max = 0, cur = 0, prev = "";
  for (const d of jours) {
    cur = prev && jourSuivant(prev) === d ? cur + 1 : 1;
    max = Math.max(max, cur);
    prev = d;
  }
  const dernier = jours[jours.length - 1];
  const vivante = dernier === today || (dernier && jourSuivant(dernier) === today);
  return { max, actuelle: vivante ? cur : 0 };
}

/** Indicateurs d'un jour pour un joueur : 1er (avec au moins 2 joueurs), sans faute, plus rapide. */
export function exploitsDuJour(jour: Resultat[], userId: string) {
  const moi = jour.find((r) => r.userId === userId);
  if (!moi) return { premier: false, sansFaute: false, plusRapide: false };
  const duel = jour.length >= TROPHEES.MIN_JOUEURS_DUEL;
  return {
    premier: duel && moi.rang === 1,
    sansFaute: moi.erreurs === 0,
    plusRapide: duel && moi.dureeMs === Math.min(...jour.map((r) => r.dureeMs)),
  };
}

/** Vitrine de trophées d'un joueur, à partir de tous les résultats du groupe. */
export function vitrine(resultats: Resultat[], userId: string, today: string): Vitrine {
  const parJour = new Map<string, Resultat[]>();
  for (const r of resultats) parJour.set(r.dayId, [...(parJour.get(r.dayId) ?? []), r]);
  let premier = 0, sansFaute = 0, plusRapide = 0;
  for (const jour of parJour.values()) {
    const e = exploitsDuJour(jour, userId);
    premier += +e.premier; sansFaute += +e.sansFaute; plusRapide += +e.plusRapide;
  }
  const miens = resultats.filter((r) => r.userId === userId);
  const s = series(miens.map((r) => r.date), today);
  const quizJoues = miens.length;
  const trophees: Trophee[] = [
    { id: "premier", nom: "1er du jour", description: "Finir 1er d'un quiz du jour (au moins 2 joueurs)", nombre: premier, cumulable: true },
    { id: "sans-faute", nom: "Sans faute", description: "Faire 10/10 à un quiz du jour", nombre: sansFaute, cumulable: true },
    { id: "rapide", nom: "Le plus rapide", description: "Finir un quiz plus vite que tous les autres", nombre: plusRapide, cumulable: true },
    ...TROPHEES.SERIES_JOURS.map((n) => ({
      id: `serie-${n}`, nom: `Série de ${n} jours`, description: `Jouer ${n} jours d'affilée`, nombre: +(s.max >= n), cumulable: false,
    })),
    ...TROPHEES.QUIZ_JOUES.map((n) => ({
      id: `quiz-${n}`, nom: `${n} quiz joués`, description: `Terminer ${n} quiz`, nombre: +(quizJoues >= n), cumulable: false,
    })),
  ];
  return { trophees, serieActuelle: s.actuelle, serieMax: s.max, quizJoues };
}

/* ------------------------------------------------------------------ trophées de la semaine, ligue du mois (D36, D37) */

const jourUTC = (d: string) => new Date(d + "T00:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const plusJours = (d: string, n: number) => { const x = jourUTC(d); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
/** Lundi de la semaine d'une date (semaine du lundi au dimanche). */
export const lundiDe = (d: string) => plusJours(d, -((jourUTC(d).getUTCDay() + 6) % 7));
/** Une semaine est réglée quand plus aucun de ses quiz n'est rattrapable : dimanche + RATTRAPAGE_JOURS < aujourd'hui. */
export const semaineReglee = (lundi: string, today: string) => plusJours(lundi, 6 + CONFIG.RATTRAPAGE_JOURS) < today;
/** Dernier jour du mois d'une date (AAAA-MM-JJ). */
export const finDuMois = (d: string) => { const x = jourUTC(d.slice(0, 8) + "01"); x.setUTCMonth(x.getUTCMonth() + 1); x.setUTCDate(0); return iso(x); };

/** Une semaine d'un joueur : gemmes des quiz du jour, gemmes solo (déjà plafonnées par jour), quiz manqués non rattrapés. */
export type ScoreSemaine = { semaine: string; userId: string; gemmes: number; solo: number; manques: number };
export type BilanJoueur = { userId: string; gemmes: number; solo: number; score: number; manques: number; rang: number | null; gain: number; perte: number; total: number };
export type BilanSemaine = { lundi: string; dimanche: string; reglee: boolean; joueurs: BilanJoueur[] };

/**
 * Classement d'une semaine au score (gemmes + gemmes solo) : seuls ceux qui ont marqué sont classés,
 * les ex æquo partagent le rang et le gain (TROPHEES.SEMAINE_GAINS[rang − 1]).
 */
export function gainsSemaine(scores: { userId: string; score: number }[]): Map<string, { rang: number | null; gain: number }> {
  const classes = scores.filter((s) => s.score > 0);
  const gains: readonly number[] = TROPHEES.SEMAINE_GAINS;
  return new Map(scores.map((s): [string, { rang: number | null; gain: number }] => {
    if (s.score <= 0) return [s.userId, { rang: null, gain: 0 }];
    const rang = 1 + classes.filter((o) => o.score > s.score).length;
    return [s.userId, { rang, gain: gains[rang - 1] ?? 0 }];
  }));
}

/**
 * Bilans semaine par semaine, dans l'ordre. `total` = trophées après la semaine, jamais sous 0 (appliqué semaine
 * après semaine). Les semaines pas encore réglées sont provisoires : leur total est une projection.
 */
export function bilans(scores: ScoreSemaine[], userIds: string[], today: string): BilanSemaine[] {
  const semaines = [...new Set(scores.map((s) => s.semaine))].sort();
  const total = new Map(userIds.map((u) => [u, 0]));
  return semaines.map((lundi) => {
    const lignes = userIds.map((userId) => {
      const s = scores.find((x) => x.semaine === lundi && x.userId === userId);
      const gemmes = s?.gemmes ?? 0, solo = s?.solo ?? 0;
      return { userId, gemmes, solo, score: gemmes + solo, manques: s?.manques ?? 0 };
    });
    const g = gainsSemaine(lignes);
    const joueurs = lignes.map((l) => {
      const { rang, gain } = g.get(l.userId)!;
      const perte = l.manques * TROPHEES.PENALITE_QUIZ_MANQUE;
      const t = Math.max(0, (total.get(l.userId) ?? 0) + gain - perte);
      total.set(l.userId, t);
      return { ...l, rang, gain, perte, total: t };
    });
    return { lundi, dimanche: plusJours(lundi, 6), reglee: semaineReglee(lundi, today), joueurs };
  });
}

export type EtatTrophees = {
  /** Trophées au dernier bilan de fin de mois : ils fixent la ligue du mois en cours. */
  fige: number;
  /** Trophées des semaines réglées. */
  courant: number;
  /** Avec les semaines encore provisoires. */
  projection: number;
};

/**
 * Trophées d'un joueur. Une semaine compte pour le mois de son dimanche ; la ligue du mois en cours est celle
 * des trophées à la fin du mois précédent (montée ou descente), recalculée une fois par mois.
 */
export function etatTrophees(b: BilanSemaine[], userId: string, today: string): EtatTrophees {
  const mois = today.slice(0, 7);
  let fige = 0, courant = 0, projection = 0;
  for (const s of b) {
    const t = s.joueurs.find((j) => j.userId === userId)?.total ?? projection;
    projection = t;
    if (!s.reglee) continue;
    courant = t;
    if (s.dimanche.slice(0, 7) < mois) fige = t;
  }
  return { fige, courant, projection };
}
