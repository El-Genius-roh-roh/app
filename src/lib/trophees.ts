// TROPHÉES (fin de saison), LIGUES ET BADGES (docs/04 §8) : fonctions pures, testées dans trophees.test.ts.
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

/* ------------------------------------------------------------------ trophées de fin de saison */

/**
 * Trophées gagnés à la fin d'une saison d'une matière (D30), d'après le classement final aux gemmes :
 * nombre de jours de la saison × nombre de joueurs classés derrière soi. Jamais négatif ;
 * à égalité, les joueurs ne se comptent pas l'un l'autre.
 */
export function tropheesFinSaison(classement: { userId: string; rang: number }[], nbJours: number): Map<string, number> {
  return new Map(classement.map((r) => [
    r.userId,
    TROPHEES.PAR_JOUR_PAR_JOUEUR_DERRIERE * nbJours * classement.filter((o) => o.rang > r.rang).length,
  ]));
}
