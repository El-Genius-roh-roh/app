// Tableau de bord personnel (D38) : défis du jour et succès. Fonctions pures, testées dans succes.test.ts.
import { SUCCES } from "@/config/constants";
import { series, type Vitrine } from "./trophees";

/* ------------------------------------------------------------------ défis du jour */

export type Defi = { id: string; titre: string; detail: string; fait: boolean; href: string; mode: "solo" | "multi" | "quiz" };

export type EntreeDefis = {
  /** Défis du jour de mes matières (D41) : faits / prévus aujourd'hui. */
  quiz: { faits: number; total: number; href: string };
  /** Sessions solo terminées aujourd'hui, par type. */
  solo: { flashcards: number; memory: number; arene: number; relier?: number };
  /** Parties multijoueur terminées aujourd'hui (Arène entre humains, jeu de plateau). */
  multi: number;
  /** Matière conseillée pour les outils de révision (de vraies notions d'abord, puis le plus de cartes), null s'il n'y en a pas. */
  matiere: string | null;
  /** Compte premium (D42) : flashcards et Arène. */
  premium: boolean;
};

/**
 * Défis du jour : le défi du jour (s'il y en a), deux outils de révision dans la matière conseillée, et pour un compte
 * premium une partie d'Arène. Un compte gratuit n'a que des défis qu'il peut faire : Memory et Relier au lieu des
 * flashcards, pas d'Arène (D42).
 */
export function defisDuJour(e: EntreeDefis): Defi[] {
  const d: Defi[] = [];
  if (e.quiz.total > 0) d.push({
    id: "quiz", mode: "quiz", titre: e.quiz.total > 1 ? "Joue tes défis du jour" : "Joue ton défi du jour",
    detail: `${e.quiz.faits}/${e.quiz.total} joué${e.quiz.faits > 1 ? "s" : ""}`, fait: e.quiz.faits >= e.quiz.total, href: e.quiz.href,
  });
  if (e.matiere) {
    if (e.premium) d.push({ id: "flashcards", mode: "solo", titre: "Termine une session de flashcards", detail: "+5 gemmes pour ta semaine",
      fait: e.solo.flashcards > 0, href: `/matieres/${e.matiere}/flashcards` });
    d.push({ id: "memory", mode: "solo", titre: "Termine un Memory", detail: "+5 gemmes pour ta semaine",
      fait: e.solo.memory > 0, href: `/matieres/${e.matiere}/memory` });
    if (!e.premium) d.push({ id: "relier", mode: "solo", titre: "Termine une partie de Relier", detail: "+5 gemmes pour ta semaine",
      fait: (e.solo.relier ?? 0) > 0, href: `/matieres/${e.matiere}/relier` });
  }
  if (e.premium) d.push({ id: "arene", mode: "multi", titre: "Joue une partie d'Arène", detail: "Contre tes amis ou contre des bots",
    fait: e.multi + e.solo.arene > 0, href: "/arene" });
  return d;
}

/* ------------------------------------------------------------------ succès */

export type Succes = {
  id: string; nom: string; description: string; icone: string;
  obtenu: boolean;
  /** Succès cumulables (×N). */
  nombre?: number;
  /** Progression vers le succès (n / cible). */
  progres?: { n: number; cible: number };
  /** Titre détenu tant qu'on reste le meilleur du groupe (il peut être perdu). */
  titre?: boolean;
};

export type EntreeSucces = {
  today: string;
  /** Jours où le joueur a ouvert l'application. */
  visites: string[];
  /** Badges des quiz du jour, tous groupes confondus. */
  vitrine: Vitrine;
  /** Sessions solo terminées depuis toujours, par type. */
  solo: { flashcards: number; memory: number; arene: number };
  /** Parties d'Arène classées (entre humains). */
  areneParties: number;
  /** Semaines gagnées (1er du groupe), semaines réglées seulement. */
  semainesGagnees: number;
  /** Titres détenus dans au moins un groupe. */
  plusRapide: boolean;
  plusAssidu: boolean;
};

const ICONE_BADGE: Record<string, string> = { premier: "trophy", "sans-faute": "target", rapide: "clock" };

export function succes(e: EntreeSucces): Succes[] {
  const v = series(e.visites, e.today);
  const palier = (id: string, nom: string, description: string, icone: string, n: number, cible: number): Succes =>
    ({ id, nom, description, icone, obtenu: n >= cible, progres: { n: Math.min(n, cible), cible } });
  const badges = e.vitrine.trophees.map((t): Succes => t.cumulable
    ? { id: t.id, nom: t.nom, description: t.description, icone: ICONE_BADGE[t.id] ?? "trophy", obtenu: t.nombre > 0, nombre: t.nombre }
    : { id: t.id, nom: t.nom, description: t.description, icone: t.id.startsWith("serie") ? "flame" : "book", obtenu: t.nombre > 0 });
  const areneTotal = e.areneParties + e.solo.arene;
  return [
    // obtenu dès qu'une série a atteint n jours ; sinon la progression montre la série en cours
    ...SUCCES.FIDELE_JOURS.map((n, i) => ({ ...palier(`fidele-${n}`, i === 0 ? "Fidèle" : "Inséparable",
      `Ouvrir l'application ${n} jours d'affilée`, "calendar", v.max >= n ? n : v.actuelle, n) })),
    { id: "champion", nom: "Champion de la semaine", description: "Finir 1er de son groupe sur une semaine", icone: "trophy",
      obtenu: e.semainesGagnees > 0, nombre: e.semainesGagnees },
    { id: "eclair", nom: "L'éclair de la bande", description: `Temps moyen le plus court du groupe (au moins ${SUCCES.MIN_QUIZ_TITRE} quiz)`,
      icone: "clock", obtenu: e.plusRapide, titre: true },
    { id: "pilier", nom: "Le pilier du groupe", description: "Le plus de quiz du jour joués dans le groupe", icone: "users", obtenu: e.plusAssidu, titre: true },
    ...badges,
    palier("flashcards", "Roi des flashcards", `Terminer ${SUCCES.SESSIONS} sessions de flashcards`, "cards", e.solo.flashcards, SUCCES.SESSIONS),
    palier("memory", "Mémoire d'éléphant", `Terminer ${SUCCES.SESSIONS} Memory`, "lightbulb", e.solo.memory, SUCCES.SESSIONS),
    palier("gladiateur", "Gladiateur", `Jouer ${SUCCES.SESSIONS} parties d'Arène`, "swords", areneTotal, SUCCES.SESSIONS),
  ];
}

/**
 * Titres de groupe : le plus rapide (temps moyen le plus court, au moins SUCCES.MIN_QUIZ_TITRE quiz) et le plus assidu
 * (le plus de quiz joués). Ex æquo : tous détiennent le titre. Il faut au moins 2 joueurs en lice.
 */
export function titresDuGroupe(stats: { userId: string; quiz: number; dureeMoyMs: number }[]): { plusRapide: Set<string>; plusAssidu: Set<string> } {
  const joueurs = stats.filter((s) => s.quiz > 0);
  if (joueurs.length < 2) return { plusRapide: new Set(), plusAssidu: new Set() };
  const eligibles = joueurs.filter((s) => s.quiz >= SUCCES.MIN_QUIZ_TITRE);
  const minDuree = Math.min(...eligibles.map((s) => s.dureeMoyMs));
  const maxQuiz = Math.max(...joueurs.map((s) => s.quiz));
  return {
    plusRapide: new Set(eligibles.length >= 2 ? eligibles.filter((s) => s.dureeMoyMs === minDuree).map((s) => s.userId) : []),
    plusAssidu: new Set(joueurs.filter((s) => s.quiz === maxQuiz).map((s) => s.userId)),
  };
}
