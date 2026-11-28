// Moteur du jeu de plateau. Fonctions pures (aucune E/S) : testables avec Vitest.
// Comme l'Arène, l'état avance « paresseusement » (advance) à chaque requête : chaque phase démarre
// à l'horodatage exact de l'événement précédent, jamais à « maintenant », ce qui permet de rattraper
// plusieurs tours de bots d'un coup.
import { PLATEAU } from "@/config/constants";
import { buildRounds, type PoolQuestion, type Round } from "../arena/engine";

export type Theme = { id: string; nom: string };
export type Joueur = { id: string; name: string; bot: boolean; skill: number; pos: number; left: boolean; bonnes: number; tentees: number };
export type Phase = "lobby" | "lancer" | "question" | "resultat" | "final";
export type Plan = { at: number; choice?: number }; // action prévue d'un bot (lancer ou réponse)
export type Question = Round & { theme: string };
export type State = {
  code: string; groupId: string; host: string; phase: Phase; v: number;
  themes: Theme[]; cases: string[]; // cases[i] = id du thème de la case i (cases[0] = départ, sans thème)
  banque: Record<string, Round[]>; curseur: Record<string, number>;
  joueurs: Joueur[]; tour: number; // index du joueur actif
  de: number | null; cible: number | null; question: Question | null;
  reponse: { choice: number | null; ok: boolean; at: number } | null;
  phaseStart: number; deadline: number; plan: Plan | null; gagnant: string | null; journal: string[];
};

export const joueur = (id: string, name: string, bot: boolean, skill: number): Joueur =>
  ({ id, name, bot, skill, pos: 0, left: false, bonnes: 0, tentees: 0 });

export function newState(code: string, groupId: string, host: { id: string; name: string }): State {
  return {
    code, groupId, host: host.id, phase: "lobby", v: 1, themes: [], cases: [], banque: {}, curseur: {},
    joueurs: [joueur(host.id, host.name, false, 0)], tour: 0, de: null, cible: null, question: null, reponse: null,
    phaseStart: 0, deadline: 0, plan: null, gagnant: null, journal: [],
  };
}

/**
 * Plateau : chaque case (1..n) reçoit un thème. On distribue les thèmes par « tours » (chaque thème une fois par tour,
 * dans un ordre tiré au sort à chaque tour) : répartition équilibrée et, dès 2 thèmes, jamais deux cases voisines du même thème.
 */
export function construirePlateau(themes: Theme[], n: number, rand: () => number): string[] {
  const ids = themes.map((t) => t.id);
  const out: string[] = [];
  while (out.length < n) {
    const tour = [...ids];
    for (let i = tour.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [tour[i], tour[j]] = [tour[j], tour[i]]; }
    if (tour.length > 1 && tour[0] === out[out.length - 1]) [tour[0], tour[1]] = [tour[1], tour[0]];
    out.push(...tour);
  }
  return ["", ...out.slice(0, n)];
}

export function startGame(s: State, themes: Theme[], pools: Record<string, PoolQuestion[]>, now: number, rand: () => number) {
  s.themes = themes;
  s.cases = construirePlateau(themes, PLATEAU.CASES, rand);
  s.banque = Object.fromEntries(themes.map((t) => [t.id, buildRounds(pools[t.id] ?? [], "mix", 999, rand)]));
  s.curseur = Object.fromEntries(themes.map((t) => [t.id, 0]));
  s.joueurs.forEach((j) => { j.pos = 0; j.bonnes = 0; j.tentees = 0; });
  s.gagnant = null;
  s.journal = [];
  s.tour = s.joueurs[0].left ? suivant(s, 0) : 0;
  debutTour(s, now, rand);
}

const actif = (s: State) => s.joueurs[s.tour];
function suivant(s: State, i: number) {
  for (let k = 1; k <= s.joueurs.length; k++) { const j = (i + k) % s.joueurs.length; if (!s.joueurs[j].left) return j; }
  return i;
}
const log = (s: State, t: string) => { s.journal = [t, ...s.journal].slice(0, 8); };

function debutTour(s: State, at: number, rand: () => number) {
  s.phase = "lancer"; s.phaseStart = at; s.deadline = at + PLATEAU.LANCER_S * 1000;
  s.de = null; s.cible = null; s.question = null; s.reponse = null;
  s.plan = actif(s).bot ? { at: at + 1200 + Math.round(rand() * 1300) } : null;
}

/** Prochaine question du thème : la file tourne quand elle est épuisée (les banques sont petites). */
function tirer(s: State, theme: string): Question {
  const file = s.banque[theme];
  const i = s.curseur[theme] ?? 0;
  s.curseur[theme] = (i + 1) % file.length;
  return { ...file[i], theme };
}

function lancer(s: State, at: number, rand: () => number) {
  const j = actif(s);
  s.de = 1 + Math.floor(rand() * PLATEAU.FACES);
  s.cible = Math.min(j.pos + s.de, PLATEAU.CASES);
  s.question = tirer(s, s.cases[s.cible]);
  s.phase = "question"; s.phaseStart = at; s.deadline = at + PLATEAU.REPONSE_S * 1000;
  if (j.bot) {
    const q = s.question;
    const autres = q.choices.map((_, i) => i).filter((i) => i !== q.key);
    const choice = rand() < j.skill || !autres.length ? q.key : autres[Math.floor(rand() * autres.length)];
    s.plan = { at: at + 2500 + Math.round(rand() * 6000), choice };
  } else s.plan = null;
}

function repondre(s: State, choice: number | null, at: number) {
  const j = actif(s);
  const q = s.question!;
  const ok = choice !== null && choice === q.key;
  j.tentees += 1;
  if (ok) { j.bonnes += 1; j.pos = s.cible!; }
  s.reponse = { choice, ok, at };
  const theme = s.themes.find((t) => t.id === q.theme)?.nom ?? "";
  log(s, ok
    ? `${j.name} fait ${s.de}, répond juste en ${theme} et avance case ${j.pos}.`
    : `${j.name} fait ${s.de}, ${choice === null ? "ne répond pas" : "se trompe"} en ${theme} et reste case ${j.pos}.`);
  if (ok && j.pos >= PLATEAU.CASES) s.gagnant = j.id;
  s.phase = "resultat"; s.phaseStart = at; s.deadline = at + PLATEAU.RESULTAT_S * 1000; s.plan = null;
}

type R = { ok: true } | { ok: false; error: string };
export function actionLancer(s: State, userId: string, now: number, rand: () => number): R {
  if (s.phase !== "lancer") return { ok: false, error: "Ce n'est pas le moment de lancer le dé." };
  if (actif(s).id !== userId) return { ok: false, error: "Ce n'est pas ton tour." };
  lancer(s, now, rand);
  s.v += 1;
  return { ok: true };
}
export function actionRepondre(s: State, userId: string, choice: unknown, now: number): R {
  if (s.phase !== "question" || !s.question) return { ok: false, error: "Trop tard !" };
  if (actif(s).id !== userId) return { ok: false, error: "Ce n'est pas ton tour." };
  if (!Number.isInteger(choice) || (choice as number) < 0 || (choice as number) >= s.question.choices.length) return { ok: false, error: "Choix invalide." };
  repondre(s, choice as number, Math.min(now, s.deadline));
  s.v += 1;
  return { ok: true };
}

/** Fait avancer la partie jusqu'à `now` : bots, délais dépassés, tours suivants. Retourne true si l'état a changé. */
export function advance(s: State, now: number, rand: () => number): boolean {
  let changed = false;
  for (let guard = 0; guard < 1000; guard++) {
    if (s.phase === "lobby" || s.phase === "final") break;
    if (s.joueurs.every((j) => j.left)) { s.phase = "final"; changed = true; break; }
    if ((s.phase === "lancer" || s.phase === "question") && actif(s).left) {
      // le joueur actif est parti : son tour passe immédiatement au suivant
      s.tour = suivant(s, s.tour);
      debutTour(s, Math.min(now, s.phaseStart), rand);
      changed = true;
      continue;
    }
    const at = s.plan ? Math.min(s.plan.at, s.deadline) : s.deadline;
    if (s.phase === "lancer") {
      if (now < at) break;
      lancer(s, at, rand);
    } else if (s.phase === "question") {
      if (now < at) break;
      repondre(s, s.plan ? s.plan.choice ?? null : null, at);
    } else {
      if (now < s.deadline) break;
      if (s.gagnant) { s.phase = "final"; s.phaseStart = s.deadline; changed = true; break; }
      s.tour = suivant(s, s.tour);
      debutTour(s, s.deadline, rand);
    }
    changed = true;
  }
  if (changed) s.v += 1;
  return changed;
}

export const classement = (s: State) =>
  [...s.joueurs].sort((a, b) => Number(b.id === s.gagnant) - Number(a.id === s.gagnant) || b.pos - a.pos || b.bonnes - a.bonnes || a.name.localeCompare(b.name));

/** Vue envoyée au client : jamais la banque de questions, jamais la bonne réponse avant le résultat. */
export function viewFor(s: State, userId: string, now: number) {
  const q = s.question;
  const res = s.phase === "resultat" || s.phase === "final";
  return {
    v: s.v, now, code: s.code, phase: s.phase, host: s.host, me: userId, tour: s.joueurs[s.tour]?.id ?? null,
    deadline: s.deadline, phaseStart: s.phaseStart, arrivee: PLATEAU.CASES,
    themes: s.themes, cases: s.cases, de: s.de, cible: s.cible, gagnant: s.gagnant, journal: s.journal,
    joueurs: s.joueurs.map((j) => ({ id: j.id, name: j.name, bot: j.bot, left: j.left, pos: j.pos, bonnes: j.bonnes, tentees: j.tentees, host: j.id === s.host })),
    classement: s.phase === "final" ? classement(s).map((j) => j.id) : undefined,
    question: q && s.phase !== "lancer" ? {
      theme: q.theme, kind: q.kind, enonce: q.enonce, choices: q.choices,
      key: res ? q.key : undefined, explication: res ? q.explication : undefined,
    } : null,
    reponse: res ? s.reponse : null,
  };
}
export type Vue = ReturnType<typeof viewFor>;
