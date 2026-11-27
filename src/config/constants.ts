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
