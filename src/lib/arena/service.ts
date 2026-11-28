import crypto from "crypto";
import type { PoolClient } from "pg";
import { ARENA } from "@/config/constants";
import { pool, q } from "../db";
import { sqlToday, todayGroupe } from "../clock";
import { memberRole } from "../groups";
import { secureRand } from "../rng";
import {
  advance, buildRounds, eloChanges, MODES, newState, ranking, startGame, submitAnswer, valeur, viewFor,
  type Mode, type PoolQuestion, type State,
} from "./engine";

type Res = { status: number; body: Record<string, unknown> };
const err = (status: number, error: string): Res => ({ status, body: { error } });

/**
 * Questions jouables en Arène : uniquement celles des jours **passés** (date < aujourd'hui, heure de Paris),
 * déjà vérifiées, dans les matières du groupe. On ne rejoue jamais le quiz du jour : sinon une partie
 * d'Arène révélerait les réponses avant l'unique tentative quotidienne (D2, D9).
 */
export async function arenaPool(groupId: string): Promise<PoolQuestion[]> {
  return q<PoolQuestion>(
    `select qq.id, qq.type, qq.enonce, qq.choix, qq.correct_index, coalesce(qq.explication,'') as explication
       from questions qq join game_days g on g.id=qq.game_day_id join subjects s on s.id=qq.subject_id
      where s.group_id=$1 and g.date < ${sqlToday("g.subject_id")} and qq.verifiee`, [groupId]);
}

function genCode(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from(crypto.randomBytes(ARENA.CODE_LONGUEUR), (b) => A[b % A.length]).join("");
}

async function pseudo(userId: string) {
  const [p] = await q<{ pseudo: string | null }>("select pseudo from profiles where id=$1", [userId]);
  return p?.pseudo ?? "Joueur";
}

/** Verrouille la partie, la fait avancer jusqu'à maintenant, applique `fn`, puis sauvegarde. */
async function withRoom(code: string, fn: (s: State, c: PoolClient) => Promise<Res | void> | Res | void): Promise<Res> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    const { rows } = await c.query<{ state: State }>("select state from arena_rooms where code=$1 for update", [code.toUpperCase()]);
    if (!rows.length) { await c.query("rollback"); return err(404, "Partie introuvable."); }
    const s = rows[0].state;
    const before = s.v;
    advance(s, Date.now());
    if (s.phase === "final" && !s.rated) await rate(s, c);
    const out = (await fn(s, c)) ?? { status: 200, body: { ok: true } };
    if (s.v !== before) {
      await c.query("update arena_rooms set state=$2, phase=$3, updated_at=now() where code=$1", [s.code, JSON.stringify(s), s.phase]);
    }
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

/**
 * Fin de partie : Elo + statistiques des humains, une seule fois (idempotent grâce à `rated`).
 * Seules les parties entre au moins ARENA.MIN_HUMAINS_CLASSEE humains sont classées, et l'Elo se calcule
 * entre humains uniquement : battre des bots en boucle ne fait pas monter au classement (entraînement).
 */
async function rate(s: State, c: PoolClient) {
  const humans = s.players.filter((p) => !p.bot);
  s.rated = true;
  s.v += 1;
  if (humans.length < ARENA.MIN_HUMAINS_CLASSEE) {
    s.changes = {};
    // entraînement contre des bots : non classé, mais compte comme activité solo (succès et défis du jour, D37)
    const joue = humans.filter((h) => Object.values(h.answers).some((a) => a.choice !== null));
    if (joue.length) {
      const date = await todayGroupe(s.groupId);
      for (const h of joue) await c.query("insert into solo_sessions(user_id,group_id,type,date) values ($1,$2,'arene',$3::date)", [h.id, s.groupId, date]);
    }
    return;
  }
  const { rows } = await c.query<{ user_id: string; rating: string }>(
    "select user_id, rating from arena_ratings where group_id=$1 and user_id = any($2::uuid[])", [s.groupId, humans.map((h) => h.id)]);
  const cur = new Map(rows.map((r) => [r.user_id, Number(r.rating)]));
  const d = eloChanges(humans.map((p) => ({ id: p.id, score: valeur(s, p), rating: cur.get(p.id) ?? ARENA.RATING_INITIAL })));
  const top = ranking(s).filter((p) => !p.bot)[0];
  for (const h of humans) {
    const bonnes = Object.values(h.answers).filter((a) => a.ok).length;
    const gagne = top.id === h.id && valeur(s, h) > 0 ? 1 : 0;
    await c.query(
      `insert into arena_ratings(group_id,user_id,rating,parties,victoires,bonnes,reponses) values ($1,$2,$3,1,$4,$5,$6)
       on conflict (group_id,user_id) do update set rating=greatest(100, arena_ratings.rating + $7), parties=arena_ratings.parties+1,
         victoires=arena_ratings.victoires+$4, bonnes=arena_ratings.bonnes+$5, reponses=arena_ratings.reponses+$6, updated_at=now()`,
      [s.groupId, h.id, ARENA.RATING_INITIAL + d[h.id], gagne, bonnes, s.rounds.length, d[h.id]]);
  }
  s.changes = Object.fromEntries(humans.map((h) => [h.id, d[h.id]]));
}

/* ---------------------------------------------------------------- actions */

export async function createRoom(userId: string, groupId: string, mode: string, nrounds: number): Promise<Res> {
  if (!(await memberRole(groupId, userId))) return err(403, "Tu n'es pas membre de ce groupe.");
  if (!(mode in MODES)) return err(400, "Mode inconnu.");
  const n = Math.max(3, Math.min(20, Number.isFinite(nrounds) ? Math.floor(nrounds) : ARENA.NB_MANCHES_DEFAUT));
  const qs = await arenaPool(groupId);
  const dispo = buildRounds(qs, mode as Mode, n, secureRand()).length;
  if (dispo < Math.min(n, ARENA.MIN_QUESTIONS)) {
    return err(409, `Pas assez de questions archivées (${dispo}). L'Arène utilise les quiz des jours passés : jouez d'abord quelques quiz du jour.`);
  }
  // ménage : parties terminées ou abandonnées depuis longtemps (la table grossirait indéfiniment)
  await q(`delete from arena_rooms where updated_at < now() - ($1 || ' hours')::interval`, [String(ARENA.PURGE_APRES_H)]);
  for (let i = 0; i < 5; i++) {
    const code = genCode();
    if ((await q("select 1 from plateau_rooms where code=$1", [code])).length) continue; // un code ne désigne qu'une seule partie
    const s = newState(code, groupId, { id: userId, name: await pseudo(userId) }, mode as Mode, n);
    const ins = await q("insert into arena_rooms(code,group_id,host_id,state) values ($1,$2,$3,$4) on conflict do nothing returning code",
      [code, groupId, userId, JSON.stringify(s)]);
    if (ins.length) return { status: 200, body: { code } };
  }
  return err(500, "Impossible de créer la partie, réessaie.");
}

export async function joinRoom(userId: string, code: string): Promise<Res> {
  const name = await pseudo(userId);
  return withRoom(code, async (s) => {
    if (!(await memberRole(s.groupId, userId))) return err(403, "Cette partie est réservée aux membres du groupe.");
    const p = s.players.find((x) => x.id === userId);
    if (p) { if (p.left) { p.left = false; s.v += 1; } return { status: 200, body: { code: s.code } }; }
    if (s.phase !== "lobby") return err(409, "La partie a déjà commencé.");
    if (s.players.length >= ARENA.MAX_JOUEURS) return err(409, "Partie complète.");
    s.players.push({ id: userId, name, bot: false, skill: 0, score: 0, streak: 0, left: false, answers: {} });
    s.v += 1;
    return { status: 200, body: { code: s.code } };
  });
}

export async function addBot(userId: string, code: string): Promise<Res> {
  return withRoom(code, (s) => {
    if (s.host !== userId || s.phase !== "lobby") return err(403, "Réservé à l'hôte, avant le lancement.");
    if (s.players.length >= ARENA.MAX_JOUEURS) return err(409, "Partie complète.");
    const free = ARENA.BOTS.filter((b) => !s.players.some((p) => p.id === `bot:${b}`));
    if (!free.length) return err(409, "Plus de bot disponible.");
    const b = free[crypto.randomInt(free.length)];
    s.players.push({ id: `bot:${b}`, name: `${b} (bot)`, bot: true, skill: 0.45 + crypto.randomInt(45) / 100, score: 0, streak: 0, left: false, answers: {} });
    s.v += 1;
  });
}

export async function startRoom(userId: string, code: string): Promise<Res> {
  return withRoom(code, async (s) => {
    if (s.host !== userId || s.phase !== "lobby") return err(403, "Seul l'hôte peut lancer la partie.");
    const rounds = buildRounds(await arenaPool(s.groupId), s.mode, s.nrounds, secureRand());
    if (!rounds.length) return err(409, "Aucune question disponible.");
    startGame(s, rounds, Date.now());
    s.v += 1;
  });
}

export async function answerRoom(userId: string, code: string, round: number, choice: unknown): Promise<Res> {
  return withRoom(code, (s) => {
    const r = submitAnswer(s, userId, round, choice, Date.now());
    if (!r.ok) return err(409, r.error ?? "Refusé.");
    advance(s, Date.now()); // ferme la manche tout de suite si c'était la dernière réponse attendue
    s.v += 1;
  });
}

export async function leaveRoom(userId: string, code: string): Promise<Res> {
  return withRoom(code, async (s, c) => {
    const i = s.players.findIndex((p) => p.id === userId);
    if (i < 0) return;
    if (s.phase === "lobby") {
      s.players.splice(i, 1);
      const humans = s.players.filter((p) => !p.bot);
      if (!humans.length) { await c.query("delete from arena_rooms where code=$1", [s.code]); s.v = -1; return; }
      if (s.host === userId) s.host = humans[0].id;
    } else {
      s.players[i].left = true;
      if (s.host === userId) s.host = s.players.find((p) => !p.bot && !p.left)?.id ?? s.host;
    }
    s.v += 1;
  });
}

export async function roomState(userId: string, code: string, since: number): Promise<Res> {
  return withRoom(code, (s) => {
    if (!s.players.some((p) => p.id === userId)) return err(403, "Tu n'es pas dans cette partie.");
    if (since === s.v) return { status: 200, body: { nochange: true, now: Date.now() } };
    return { status: 200, body: viewFor(s, userId, Date.now()) };
  });
}

/* ---------------------------------------------------------------- lecture (pages) */

export async function openRooms(groupIds: string[]) {
  if (!groupIds.length) return [];
  const rows = await q<{ code: string; group_id: string; state: State; created_at: Date }>(
    `select code, group_id, state, created_at from arena_rooms
      where group_id = any($1::uuid[]) and phase='lobby' and updated_at > now() - interval '30 minutes' order by created_at desc limit 20`, [groupIds]);
  return rows.map((r) => ({
    code: r.code, groupId: r.group_id, mode: MODES[r.state.mode].titre, nrounds: r.state.nrounds,
    hote: r.state.players.find((p) => p.id === r.state.host)?.name ?? "?", joueurs: r.state.players.length,
  }));
}

export async function arenaLeaderboard(groupId: string) {
  return q<{ user_id: string; pseudo: string; rating: number; parties: number; victoires: number; precision: number | null }>(
    `select r.user_id, coalesce(p.pseudo,'?') as pseudo, round(r.rating)::int as rating, r.parties, r.victoires,
            case when r.reponses>0 then round(100.0*r.bonnes/r.reponses)::int end as precision
       from arena_ratings r join profiles p on p.id=r.user_id where r.group_id=$1 order by r.rating desc limit 50`, [groupId]);
}
