// TROPHÉES (façon Clash Royale), LIGUES ET BADGES (docs/04 §8) : fonctions pures, testées dans trophees.test.ts.
import { LIGUES, TROPHEES } from "@/config/constants";

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
  emoji: string;
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
    { id: "premier", emoji: "🥇", nom: "1er du jour", description: "Finir 1er d'un quiz du jour (au moins 2 joueurs)", nombre: premier, cumulable: true },
    { id: "sans-faute", emoji: "🎯", nom: "Sans faute", description: "Faire 10/10 à un quiz du jour", nombre: sansFaute, cumulable: true },
    { id: "rapide", emoji: "⚡", nom: "Le plus rapide", description: "Finir un quiz plus vite que tous les autres", nombre: plusRapide, cumulable: true },
    ...TROPHEES.SERIES_JOURS.map((n) => ({
      id: `serie-${n}`, emoji: "🔥", nom: `Série de ${n} jours`, description: `Jouer ${n} jours d'affilée`, nombre: +(s.max >= n), cumulable: false,
    })),
    ...TROPHEES.QUIZ_JOUES.map((n) => ({
      id: `quiz-${n}`, emoji: "📚", nom: `${n} quiz joués`, description: `Terminer ${n} quiz`, nombre: +(quizJoues >= n), cumulable: false,
    })),
  ];
  return { trophees, serieActuelle: s.actuelle, serieMax: s.max, quizJoues };
}

/* ------------------------------------------------------------------ trophées */

/** Un quiz du jour d'une matière : qui l'a joué, et s'il est terminé (jour passé). */
export type JourJeu = {
  dayId: string;
  date: string;
  subjectId: string;
  passe: boolean;
  resultats: { userId: string; erreurs: number; dureeMs: number }[];
};

const bat = (a: { erreurs: number; dureeMs: number }, b: { erreurs: number; dureeMs: number }) =>
  a.erreurs < b.erreurs || (a.erreurs === b.erreurs && a.dureeMs < b.dureeMs);

/** Trophées gagnés ou perdus ce jour-là par un joueur qui a joué : +10 par joueur battu, −10 par joueur devant. */
export function deltaJoueur(resultats: JourJeu["resultats"], userId: string): number {
  const moi = resultats.find((r) => r.userId === userId);
  if (!moi) return 0;
  const battus = resultats.filter((o) => bat(moi, o)).length;
  const devant = resultats.filter((o) => bat(o, moi)).length;
  return TROPHEES.PAR_JOUEUR_BATTU * battus - TROPHEES.PAR_JOUEUR_DEVANT * devant;
}

/** Palier sous lequel on ne redescend plus : le minimum de la meilleure ligue déjà atteinte. */
const palier = (max: number) => ligueDe(max).ligue.min;

export type Trophees = {
  /** Total actuel de chaque joueur. */
  total: Map<string, number>;
  /** Variation de chaque jour (dayId → joueur → +/−), avant application du palier. null = pas concerné. */
  deltas: Map<string, Map<string, number>>;
};

/**
 * Rejoue tous les quiz du groupe dans l'ordre chronologique.
 * - joué : +10 par joueur battu, −10 par joueur devant (égalité parfaite : 0) ;
 * - pas joué un jour passé, dans une matière où l'on a déjà joué : −10 ;
 * - jamais sous 0, ni sous le palier de la meilleure ligue déjà atteinte.
 */
export function calculerTrophees(jours: JourJeu[], membres: string[]): Trophees {
  const ordre = [...jours].sort((a, b) => a.date.localeCompare(b.date) || a.subjectId.localeCompare(b.subjectId));
  const total = new Map(membres.map((m) => [m, 0]));
  const record = new Map(membres.map((m) => [m, 0]));
  const dejaJoue = new Map(membres.map((m) => [m, new Set<string>()]));
  const deltas = new Map<string, Map<string, number>>();
  for (const j of ordre) {
    const d = new Map<string, number>();
    for (const m of membres) {
      const joue = j.resultats.some((r) => r.userId === m);
      let delta: number | null = null;
      if (joue) { delta = deltaJoueur(j.resultats, m); dejaJoue.get(m)!.add(j.subjectId); }
      else if (j.passe && dejaJoue.get(m)!.has(j.subjectId)) delta = -TROPHEES.ABSENCE;
      if (delta === null) continue;
      d.set(m, delta);
      const t = Math.max(palier(record.get(m)!), total.get(m)! + delta);
      total.set(m, t);
      record.set(m, Math.max(record.get(m)!, t));
    }
    deltas.set(j.dayId, d);
  }
  return { total, deltas };
}
