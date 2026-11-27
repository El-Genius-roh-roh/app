// Moteur du mode « Arène » (duels en direct). Fonctions pures : aucune E/S, testables avec Vitest.
// L'état d'une partie est avancé « paresseusement » (advance) à chaque requête, avec des horodatages
// explicites : pas besoin de tâche de fond côté serveur.
import { ARENA } from "@/config/constants";
import { hashString, rng, shuffled } from "../rng";

export type Mode = "blitz" | "vf" | "mix";
export const MODES: Record<Mode, { titre: string; desc: string }> = {
  blitz: { titre: "Quiz Blitz", desc: "QCM chronométrés : plus tu réponds vite, plus tu marques." },
  vf: { titre: "Vrai ou Faux", desc: "Rafale de propositions : vrai ou faux ?" },
  mix: { titre: "Mix Arena", desc: "QCM et Vrai/Faux mélangés." },
};

export type Round = {
  qid: string; kind: "qcm" | "vf"; enonce: string; choices: string[];
  key: number; explication: string; limitMs: number;
};
export type Ans = { choice: number | null; ok: boolean; pts: number; bonus: number; at: number; missed?: boolean };
export type Player = {
  id: string; name: string; bot: boolean; skill: number;
  score: number; streak: number; left: boolean; answers: Record<string, Ans>;
};
export type Phase = "lobby" | "question" | "reveal" | "final";
export type State = {
  code: string; groupId: string; host: string; mode: Mode; nrounds: number;
  phase: Phase; idx: number; roundStart: number; deadline: number; phaseStart: number;
  rounds: Round[]; players: Player[]; rated: boolean; changes: Record<string, number>; v: number;
};

/* ---------------------------------------------------------------- questions → manches */

export type PoolQuestion = {
  id: string; type: "qcm" | "vrai_faux"; enonce: string; choix: string[]; correct_index: number; explication: string;
};

const unique = (qs: PoolQuestion[]) => {
  const seen = new Set<string>();
  return qs.filter((x) => (seen.has(x.enonce) ? false : (seen.add(x.enonce), true)));
};

function asQcm(x: PoolQuestion, rand: () => number): Round {
  const perm = shuffled(x.choix.map((_, i) => i), rand);
  return {
    qid: x.id, kind: "qcm", enonce: x.enonce, choices: perm.map((i) => x.choix[i]),
    key: perm.indexOf(x.correct_index), explication: x.explication, limitMs: ARENA.DUREE_QCM_S * 1000,
  };
}

function asVf(x: PoolQuestion, rand: () => number): Round {
  if (x.type === "vrai_faux") {
    return { qid: x.id, kind: "vf", enonce: x.enonce, choices: ["Vrai", "Faux"], key: x.correct_index, explication: x.explication, limitMs: ARENA.DUREE_VF_S * 1000 };
  }
  // un QCM devient une proposition : on affiche la bonne réponse ou un distracteur
  const good = x.choix[x.correct_index];
  const wrong = x.choix.filter((_, i) => i !== x.correct_index);
  const vrai = rand() < 0.5 || wrong.length === 0;
  const shown = vrai ? good : wrong[Math.floor(rand() * wrong.length)];
  return {
    qid: x.id, kind: "vf", enonce: `${x.enonce}\n→ Proposition : « ${shown} »`, choices: ["Vrai", "Faux"],
    key: vrai ? 0 : 1, explication: `${vrai ? "Vrai" : "Faux"} — bonne réponse : ${good}. ${x.explication}`.trim(),
    limitMs: ARENA.DUREE_VF_S * 1000,
  };
}

/** Tire `n` manches dans le pool selon le mode. */
export function buildRounds(pool: PoolQuestion[], mode: Mode, n: number, rand: () => number): Round[] {
  const all = shuffled(unique(pool), rand);
  const qcm = all.filter((x) => x.type === "qcm");
  const vf = all.filter((x) => x.type === "vrai_faux");
  const out: Round[] = [];
  if (mode === "blitz") for (const x of qcm.slice(0, n)) out.push(asQcm(x, rand));
  else if (mode === "vf") for (const x of [...vf, ...qcm].slice(0, n)) out.push(asVf(x, rand));
  else {
    // mix : alternance QCM / Vrai-Faux (les vrais V/F d'abord, puis des QCM transformés)
    const a = [...qcm], b = [...vf, ...[...qcm].reverse()];
    const used = new Set<string>();
    while (out.length < n && (a.length || b.length)) {
      const wantVf = out.length % 3 === 2;
      const src = wantVf ? b : a;
      const x = src.shift() ?? (wantVf ? a : b).shift();
      if (!x || used.has(x.id)) continue;
      used.add(x.id);
      out.push(wantVf || x.type === "vrai_faux" ? asVf(x, rand) : asQcm(x, rand));
    }
  }
  return out;
}

/* ---------------------------------------------------------------- scoring */

/** Points d'une bonne réponse : 500 + jusqu'à 500 selon la rapidité, + bonus de série (cf. ARENA). */
export function pointsFor(leftMs: number, limitMs: number, streakAfter: number): { pts: number; bonus: number } {
  const speed = Math.round(ARENA.POINTS_BASE + ARENA.POINTS_VITESSE * Math.min(1, Math.max(0, leftMs) / limitMs));
  const bonus = Math.min(Math.max(streakAfter - 1, 0), ARENA.BONUS_SERIE_MAX) * ARENA.BONUS_SERIE;
  return { pts: speed + bonus, bonus };
}

export function submitAnswer(s: State, playerId: string, roundIdx: number, choice: unknown, at: number): { ok: boolean; error?: string } {
  const p = s.players.find((x) => x.id === playerId);
  if (!p) return { ok: false, error: "Tu n'es pas dans cette partie." };
  if (s.phase !== "question" || roundIdx !== s.idx) return { ok: false, error: "Trop tard !" };
  if (at > s.deadline + ARENA.TOLERANCE_MS) return { ok: false, error: "Trop tard !" };
  const r = s.rounds[s.idx];
  if (!Number.isInteger(choice) || (choice as number) < 0 || (choice as number) >= r.choices.length) return { ok: false, error: "Choix invalide." };
  if (p.answers[s.idx]) return { ok: false, error: "Déjà répondu." };
  record(p, s.idx, r, choice as number, Math.min(at, s.deadline), s.deadline);
  return { ok: true };
}

function record(p: Player, idx: number, r: Round, choice: number, at: number, deadline: number) {
  const ok = choice === r.key;
  if (ok) {
    p.streak += 1;
    const { pts, bonus } = pointsFor(deadline - at, r.limitMs, p.streak);
    p.score += pts;
    p.answers[idx] = { choice, ok, pts, bonus, at };
  } else {
    p.streak = 0;
    p.answers[idx] = { choice, ok, pts: 0, bonus: 0, at };
  }
}

/* ---------------------------------------------------------------- bots */

/** Heure à laquelle le bot répond (déterministe : même résultat quel que soit le moment du calcul). */
export function botPlan(s: State, p: Player, idx: number, roundStart: number, limitMs: number) {
  const rand = rng(hashString(`${s.code}|${idx}|${p.id}`));
  const delay = 1500 + rand() * Math.max(1000, limitMs * 0.65 - 1500);
  const r = s.rounds[idx];
  const ok = rand() < p.skill;
  const others = r.choices.map((_, i) => i).filter((i) => i !== r.key);
  const choice = ok ? r.key : others[Math.floor(rand() * others.length)];
  return { at: roundStart + Math.round(delay), choice };
}

/* ---------------------------------------------------------------- machine d'états */

export function startGame(s: State, rounds: Round[], now: number) {
  s.rounds = rounds;
  s.players.forEach((p) => { p.score = 0; p.streak = 0; p.answers = {}; });
  s.idx = 0;
  beginRound(s, now);
}

function beginRound(s: State, at: number) {
  s.phase = "question";
  s.roundStart = at;
  s.deadline = at + s.rounds[s.idx].limitMs;
  s.phaseStart = at;
}

const everyoneDone = (s: State) => s.players.every((p) => p.left || !!p.answers[s.idx]);

function closeRound(s: State, endAt: number) {
  for (const p of s.players) {
    if (!p.answers[s.idx]) {
      p.streak = 0;
      p.answers[s.idx] = { choice: null, ok: false, pts: 0, bonus: 0, at: endAt, missed: true };
    }
  }
  s.phase = "reveal";
  s.phaseStart = endAt;
}

/** Fait avancer la partie jusqu'à `now`. Retourne true si l'état a changé. */
export function advance(s: State, now: number): boolean {
  let changed = false;
  for (let guard = 0; guard < 200; guard++) {
    if (s.phase === "question") {
      const cutoff = Math.min(now, s.deadline);
      const r = s.rounds[s.idx];
      for (const p of s.players) {
        if (!p.bot || p.answers[s.idx]) continue;
        const plan = botPlan(s, p, s.idx, s.roundStart, r.limitMs);
        if (plan.at <= cutoff) { record(p, s.idx, r, plan.choice, plan.at, s.deadline); changed = true; }
      }
      if (everyoneDone(s)) {
        const times = s.players.filter((p) => !p.left).map((p) => p.answers[s.idx].at);
        closeRound(s, times.length ? Math.max(...times) : cutoff);
        changed = true;
      } else if (now >= s.deadline) {
        closeRound(s, s.deadline);
        changed = true;
      } else break;
    } else if (s.phase === "reveal") {
      const end = s.phaseStart + ARENA.REVEAL_S * 1000;
      if (now < end) break;
      if (s.idx + 1 >= s.rounds.length) { s.phase = "final"; s.phaseStart = end; changed = true; break; }
      s.idx += 1;
      beginRound(s, end);
      changed = true;
    } else break;
  }
  if (changed) s.v += 1;
  return changed;
}

/* ---------------------------------------------------------------- classement, Elo, ligues */

export const ranking = (s: State) =>
  [...s.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

export function tierOf(rating: number): string {
  if (rating < 950) return "Bronze";
  if (rating < 1100) return "Argent";
  if (rating < 1250) return "Or";
  if (rating < 1400) return "Platine";
  return "Diamant";
}

/** Elo multijoueur : somme des résultats « duel par duel » contre chaque adversaire, normalisée. */
export function eloChanges(rows: { id: string; score: number; rating: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  const n = rows.length;
  for (const p of rows) {
    if (n < 2) { out[p.id] = 0; continue; }
    let d = 0;
    for (const o of rows) {
      if (o === p) continue;
      const actual = p.score > o.score ? 1 : p.score === o.score ? 0.5 : 0;
      const expected = 1 / (1 + 10 ** ((o.rating - p.rating) / 400));
      d += actual - expected;
    }
    out[p.id] = Math.round((ARENA.K * d) / (n - 1) * 10) / 10;
  }
  return out;
}

/* ---------------------------------------------------------------- vue publique (jamais de bonne réponse avant la fin de la manche) */

export function viewFor(s: State, userId: string, now: number) {
  const rank = ranking(s);
  const pos = new Map(rank.map((p, i) => [p.id, i + 1]));
  const reveal = s.phase === "reveal" || s.phase === "final";
  const r = s.rounds[s.idx];
  const lobby = s.phase === "lobby";
  const players = (lobby ? s.players : rank).map((p) => {
    const a = p.answers[s.idx];
    return {
      id: p.id, name: p.name, bot: p.bot, left: p.left, host: p.id === s.host, score: p.score, streak: p.streak,
      rank: pos.get(p.id) ?? 0,
      answered: s.phase === "question" || s.phase === "reveal" ? !!a : false,
      round: s.phase === "reveal" && a ? { ok: a.ok, pts: a.pts, bonus: a.bonus, missed: !!a.missed, choice: a.choice } : undefined,
    };
  });
  const me = s.players.find((p) => p.id === userId);
  return {
    v: s.v, now, code: s.code, phase: s.phase, mode: s.mode, modeTitre: MODES[s.mode].titre, host: s.host, me: userId,
    idx: s.idx, nrounds: s.rounds.length || s.nrounds, deadline: s.deadline, phaseStart: s.phaseStart, revealMs: ARENA.REVEAL_S * 1000,
    players,
    classee: s.players.filter((p) => !p.bot).length >= ARENA.MIN_HUMAINS_CLASSEE,
    round: !lobby && r ? {
      kind: r.kind, enonce: r.enonce, choices: r.choices, limitMs: r.limitMs,
      key: reveal || s.phase === "reveal" ? r.key : undefined,
      explication: s.phase === "reveal" ? r.explication : undefined,
    } : undefined,
    my: me && !lobby ? { answered: !!me.answers[s.idx], choice: me.answers[s.idx]?.choice ?? null } : undefined,
    final: s.phase === "final" ? {
      changes: s.changes,
      recap: me ? s.rounds.map((rd, i) => ({
        enonce: rd.enonce, bonne: rd.choices[rd.key], explication: rd.explication,
        ok: !!me.answers[i]?.ok, pts: me.answers[i]?.pts ?? 0,
      })) : [],
    } : undefined,
  };
}

export function newState(code: string, groupId: string, host: { id: string; name: string }, mode: Mode, nrounds: number): State {
  return {
    code, groupId, host: host.id, mode, nrounds, phase: "lobby", idx: 0, roundStart: 0, deadline: 0, phaseStart: 0,
    rounds: [], players: [{ id: host.id, name: host.name, bot: false, skill: 0, score: 0, streak: 0, left: false, answers: {} }],
    rated: false, changes: {}, v: 1,
  };
}
