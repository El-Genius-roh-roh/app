// Constantes centralisées (docs/04-regles-scoring.md). Jamais codées en dur ailleurs.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "APP_NAME";

export const CONFIG = {
  QUESTIONS_PAR_JOUR: 10,
  QUESTIONS_NOUVELLES: 6,
  QUESTIONS_REVISION: 4,
  POINTS_PARTICIPATION: 10,
  POINTS_PAR_JOUEUR_BATTU: 10,
  BONUS_MULTIPLICATEUR_PAR_JOUR: 0.05,
  DUREE_MAX_TENTATIVE_MIN: 15,
  FUSEAU: "Europe/Paris",
  CODE_INVITATION_LONGUEUR: 6,
  RATIO_QCM: 0.8,
  MAX_REGENERATIONS: 2,
  // génération par copier-coller dans le chat
  CHAT_JOURS_PAR_LOT: 3,
  CHAT_SLIDES_REVISION: 6,
  CHAT_SLIDE_MAX_CARACTERES: 1500,
  CHAT_ANNALES_MAX_CARACTERES: 6000,
} as const;

// Ligues et trophées (docs/04 §8). Les points restent la base du classement mais ne sont plus affichés tels quels :
// on affiche la ligue (selon les points cumulés dans le groupe) et les trophées gagnés.
export const LIGUES = [
  { nom: "Bronze", emoji: "🥉", min: 0, fond: "from-orange-300 to-amber-500" },
  { nom: "Argent", emoji: "🥈", min: 200, fond: "from-slate-300 to-slate-500" },
  { nom: "Or", emoji: "🥇", min: 500, fond: "from-yellow-300 to-amber-500" },
  { nom: "Platine", emoji: "💠", min: 1000, fond: "from-teal-300 to-cyan-600" },
  { nom: "Diamant", emoji: "💎", min: 2000, fond: "from-sky-400 to-indigo-600" },
  { nom: "Maître", emoji: "👑", min: 3500, fond: "from-fuchsia-500 to-violet-700" },
] as const;

export const TROPHEES = {
  SERIES_JOURS: [3, 7, 30], // séries de jours consécutifs avec au moins un quiz joué dans le groupe
  QUIZ_JOUES: [10, 50],
  MIN_JOUEURS_DUEL: 2, // « 1er du jour » et « le plus rapide » exigent au moins 2 joueurs ce jour-là
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