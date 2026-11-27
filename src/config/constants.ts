// Constantes centralisées (docs/04-regles-scoring.md). Jamais codées en dur ailleurs.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "APP_NAME";

export const CONFIG = {
  QUESTIONS_PAR_JOUR: 10,
  QUESTIONS_NOUVELLES: 7,
  QUESTIONS_REVISION: 3,
  POINTS_PARTICIPATION: 10,
  POINTS_PAR_JOUEUR_BATTU: 5,
  BONUS_MULTIPLICATEUR_PAR_JOUR: 0.05,
  DUREE_MAX_TENTATIVE_MIN: 15,
  FUSEAU: "Europe/Paris",
  CODE_INVITATION_LONGUEUR: 6,
  RATIO_QCM: 0.8,
  MAX_REGENERATIONS: 2,
} as const;

// Mode « Arène » (duels en direct, hors classements quotidiens : docs/04 n'est pas modifié).
export const ARENA = {
  DUREE_QCM_S: 15,
  DUREE_VF_S: 10,
  REVEAL_S: 6,
  POINTS_BASE: 500,
  POINTS_VITESSE: 500,
  BONUS_SERIE: 50,
  BONUS_SERIE_MAX: 3,
  TOLERANCE_MS: 600,
  MAX_JOUEURS: 12,
  MIN_QUESTIONS: 5,
  NB_MANCHES_DEFAUT: 8,
  RATING_INITIAL: 1000,
  K: 32,
  CODE_LONGUEUR: 4,
  BOTS: ["Gauss", "Fisher", "Bayes", "Turing", "Pearson", "Markov", "Laplace", "Student"],
} as const;