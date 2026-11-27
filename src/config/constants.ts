// Constantes centralisées (docs/04-regles-scoring.md). Jamais codées en dur ailleurs.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "APP_NAME";

export const CONFIG = {
  QUESTIONS_PAR_JOUR: 10,
  QUESTIONS_NOUVELLES: 6,
  QUESTIONS_REVISION: 4,
  POINTS_PARTICIPATION: 10,
  POINTS_PAR_JOUEUR_BATTU: 10,
  BONUS_MULTIPLICATEUR_PAR_JOUR: 0.05,
  RATTRAPAGE_JOURS: 3, // un quiz manqué peut être rattrapé pendant 3 jours (D29)
  PENALITE_RETARD_PAR_JOUR: 0.1, // −10 % de gemmes par jour de retard
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
  // génération automatique par l'IA (API compatible OpenAI, ex. service IA d'Onyxia)
  LLM_MODELE: "qwen3-6-35b-moe", // remplaçable par la variable d'environnement LLM_MODEL
  LLM_TIMEOUT_S: 240,
  LLM_TIMEOUT_DEMARRAGE_S: 25, // quiz encore vide au clic sur « Commencer » : au-delà, génération simulée
  LLM_PREPARATION_INTERVALLE_MIN: 10, // préparation en arrière-plan : au plus une tentative par matière toutes les N min
  LLM_MAX_TOKENS: 12000,
  LLM_VERIF_REFLEXION: true, // vérification des réponses avec « réflexion » (plus lente, nettement plus fiable)
  LLM_JOURS_PAR_APPEL: 1, // un quiz par appel : réponse rapide (~15 s) et moins d'erreurs
  LLM_JOURS_A_L_AVANCE: 3, // quiz préparés en arrière-plan : aujourd'hui + 2 jours
} as const;

// Trophées façon Clash Royale (docs/04 §8, D24) : on en gagne en battant des joueurs, on en perd en se faisant battre.
// Les ligues se débloquent selon le nombre de trophées ; on ne retombe jamais sous le palier d'une ligue atteinte.
export const TROPHEES = {
  // Fin de saison (D30) : trophées = jours de la saison × joueurs classés derrière soi (aux gemmes de la saison).
  PAR_JOUR_PAR_JOUEUR_DERRIERE: 1,
  SERIES_JOURS: [3, 7, 30], // badges : jours consécutifs avec au moins un quiz joué
  QUIZ_JOUES: [10, 50], // badges
  MIN_JOUEURS_DUEL: 2, // badges « 1er du jour » et « le plus rapide » : au moins 2 joueurs ce jour-là
} as const;

export const LIGUES = [
  { nom: "Bronze", min: 0, clair: "#f3b47c", fonce: "#8a4b22", fond: "from-orange-300 to-amber-700" },
  { nom: "Argent", min: 100, clair: "#f1f4f9", fonce: "#6b7689", fond: "from-slate-300 to-slate-600" },
  { nom: "Or", min: 250, clair: "#ffe58a", fonce: "#a86b00", fond: "from-yellow-300 to-amber-600" },
  { nom: "Platine", min: 500, clair: "#b5f5ea", fonce: "#127a73", fond: "from-teal-300 to-cyan-700" },
  { nom: "Diamant", min: 800, clair: "#b9e2ff", fonce: "#2b44b8", fond: "from-sky-400 to-accent-700" },
  { nom: "Maître", min: 1200, clair: "#f6b8ff", fonce: "#5b1385", fond: "from-accent-500 to-accent-800" },
] as const;

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
  MIN_HUMAINS_CLASSEE: 2, // en dessous (seul contre des bots) : partie d'entraînement, non classée
  PURGE_APRES_H: 24, // parties supprimées après N heures sans activité
  CODE_LONGUEUR: 4,
  BOTS: ["Gauss", "Fisher", "Bayes", "Turing", "Pearson", "Markov", "Laplace", "Student"],
} as const;