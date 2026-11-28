// Constantes centralisées (docs/04-regles-scoring.md). Jamais codées en dur ailleurs.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "APP_NAME";
/** Cookie du thème choisi avec le bouton du haut (« clair » ou « sombre » ; absent = celui du système). */
export const THEME_COOKIE = "theme";

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
  CHAT_PLAN_MAX_CARACTERES: 3000, // vue d'ensemble de la matière (titres des chapitres et notions de tous les cours) dans le prompt
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

// Trophées de la semaine et ligue du mois (docs/04 §8, D36) : la régularité paie, l'irrégularité coûte.
// Chaque semaine (lundi → dimanche), le meilleur score du groupe (gemmes des quiz + gemmes solo) gagne des trophées ;
// chaque quiz du jour manqué et non rattrapé en fait perdre (jamais sous 0). La ligue, fixée par le total de trophées,
// est recalculée à la fin de chaque mois : on peut monter comme descendre.
export const TROPHEES = {
  SEMAINE_GAINS: [20], // trophées selon le rang de la semaine : [1er, 2e, …] (ex æquo : même gain)
  PENALITE_QUIZ_MANQUE: 10, // par quiz du jour non joué, une fois le délai de rattrapage passé
  SERIES_JOURS: [3, 7, 30], // badges : jours consécutifs avec au moins un quiz joué
  QUIZ_JOUES: [10, 50], // badges
  MIN_JOUEURS_DUEL: 2, // badges « 1er du jour » et « le plus rapide » : au moins 2 joueurs ce jour-là
} as const;

export const LIGUES = [
  { nom: "Bronze", min: 0, clair: "#f3b47c", fonce: "#8a4b22", fond: "from-orange-300 to-amber-700" },
  { nom: "Argent", min: 100, clair: "#f1f4f9", fonce: "#6b7689", fond: "from-slate-300 to-slate-600" },
  { nom: "Or", min: 250, clair: "#ffe58a", fonce: "#a86b00", fond: "from-yellow-300 to-amber-600" },
  { nom: "Platine", min: 500, clair: "#b5f5ea", fonce: "#127a73", fond: "from-teal-300 to-cyan-700" },
  { nom: "Diamant", min: 800, clair: "#b9e2ff", fonce: "#2b44b8", fond: "from-sky-400 to-indigo-700" },
  { nom: "Maître", min: 1200, clair: "#ffb4b4", fonce: "#8f1d2c", fond: "from-rose-400 to-red-800" },
] as const;

// Jeu de plateau : chacun son tour lance le dé et répond à une question du thème (matière) de la case visée
export const PLATEAU = {
  CASES: 24, // case 0 = départ, case CASES = arrivée
  FACES: 6,
  LANCER_S: 15, // sans lancer dans ce délai, le dé est lancé automatiquement
  REPONSE_S: 25, // sans réponse : compté faux, le joueur reste sur place
  RESULTAT_S: 4, // affichage de la correction avant le tour suivant
  MAX_JOUEURS: 6,
};

// Arène, mode Course : chaque bonne réponse fait avancer sa voiture, chaque erreur la fait reculer
export const COURSE = {
  ARRIVEE: 10, // cases jusqu'à la ligne d'arrivée
  BONNE: 2,
  TURBO: 1, // en plus, pour la bonne réponse la plus rapide de la manche
  ERREUR: 1, // recul sur une mauvaise réponse (pas de réponse : on reste sur place)
};

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
// Activités solo (D37) : flashcards, Memory, Arène contre des bots. Chaque session terminée rapporte des gemmes solo,
// plafonnées par jour, qui comptent dans le score de la semaine (pas dans les classements des quiz du jour).
export const SOLO = {
  GEMMES_PAR_SESSION: 5,
  MAX_PAR_JOUR: 15,
  TYPES: ["flashcards", "memory", "arene", "relier"] as const,
};

// Défi du jour (D41, remplace D40) : le quiz du jour d'une matière change de format chaque jour, selon sa date de jeu.
// Mêmes questions, même score (erreurs puis temps), même pénalité s'il est raté (TROPHEES.PENALITE_QUIZ_MANQUE).
export const DEFI = {
  FORMATS: ["qcm", "relier", "vf"] as const,
};

// Relier : chaque notion (ou question) avec sa définition (ou réponse), en touchant l'une puis l'autre
export const RELIER = {
  PAIRES: 5,
  MIN_PAIRES: 4, // en dessous, la partie n'est pas proposée
  TERME_MAX: 110,
  DEFINITION_MAX: 140,
  DELAI_ERREUR_MS: 700, // une mauvaise association clignote ce temps-là
};

// Tableau de bord personnel (D38) : succès à débloquer
export const SUCCES = {
  FIDELE_JOURS: [7, 30], // ouvrir l'application N jours d'affilée
  SESSIONS: 10, // flashcards, Memory, parties d'Arène
  MIN_QUIZ_TITRE: 3, // quiz joués pour prétendre au titre « l'éclair de la bande »
};

// Notions du cours (D39) : paires « concept ↔ définition » tirées des pages de cours (IA, sinon détection simple)
export const NOTIONS = {
  TERME_MAX: 60,
  DEFINITION_MIN: 12,
  DEFINITION_MAX: 220,
  DEFINITION_IA: 140, // longueur demandée à l'IA
  PAGES_PAR_APPEL: 8, // pages envoyées à l'IA par appel
  PAGE_MAX_CARACTERES: 1500,
  MEMORY_DEFINITION_MAX: 140, // au-delà, la carte du Memory est illisible sur téléphone
};

// Flashcards : recto = l'énoncé, verso = la bonne réponse et l'explication (questions vérifiées des jours passés)
export const FLASHCARDS = {
  PAQUET: 12, // cartes par session ; les moins sues passent en premier
  MIN: 3, // en dessous, les flashcards ne sont pas proposées
};

// Memory : retrouver, face cachée, chaque question et sa bonne réponse (questions vérifiées des jours passés)
export const MEMORY = {
  PAIRES: 6, // 12 cartes
  MIN_PAIRES: 4, // en dessous, la partie n'est pas proposée
  NOTION_MAX: 110, // caractères : au-delà, la carte devient illisible sur téléphone
  DEFINITION_MAX: 80,
  DELAI_ERREUR_MS: 1800, // deux cartes qui ne vont pas ensemble restent visibles ce temps (ou jusqu'au clic suivant)
};
