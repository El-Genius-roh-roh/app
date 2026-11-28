import crypto from "crypto";
import type { PoolClient } from "pg";
import { ARENA, PLATEAU } from "@/config/constants";
import { pool, q } from "../db";
import { sqlToday } from "../clock";
import { memberRole } from "../groups";
import { secureRand } from "../rng";
import type { PoolQuestion } from "../arena/engine";
import { actionLancer, actionRepondre, advance, joueur, newState, startGame, viewFor, type State, type Theme } from "./engine";

type Res = { status: number; body: Record<string, unknown> };
const err = (status: number, error: string): Res => ({ status, body: { error } });

/**
 * Thèmes du plateau = matières du groupe qui ont des questions jouables, avec la même règle que l'Arène :
 * questions vérifiées des jours **passés** uniquement (jamais le quiz du jour, sinon il serait dévoilé).
 */
export async function themesDuGroupe(groupId: string): Promise<{ themes: Theme[]; pools: Record<string, PoolQuestion[]> }> {
  const rows = await q<PoolQuestion & { subject_id: string; nom: string }>(
    `select qq.id, qq.type, qq.enonce, qq.choix, qq.correct_index, coalesce(qq.explication,'') as explication, s.id as subject_id, s.nom
       from questions qq join game_days g on g.id=qq.game_day_id join subjects s on s.id=qq.subject_id
      where s.group_id=$1 and g.date < ${sqlToday("g.subject_id")} and qq.verifiee
      order by s.created_at`, [groupId]);
  const pools: Record<string, PoolQuestion[]> = {};
  const themes: Theme[] = [];
  for (const r of rows) {
    if (!pools[r.subject_id]) { pools[r.subject_id] = []; themes.push({ id: r.subject_id, nom: r.nom }); }
    pools[r.subject_id].push(r);
  }
  return { themes, pools };
}

const genCode = () => {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from(crypto.randomBytes(ARENA.CODE_LONGUEUR), (b) => A[b % A.length]).join("");
};
async function pseudo(userId: string) {
  const [p] = await q<{ pseudo: string | null }>("select pseudo from profiles where id=$1", [userId]);
  return p?.pseudo ?? "Joueur";
}

/** Verrouille la partie, la fait avancer jusqu'à maintenant, applique `fn`, puis sauvegarde si besoin. */
async function withRoom(code: string, fn: (s: State, c: PoolClient) => Promise<Res | void> | Res | void): Promise<Res> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    const { rows } = await c.query<{ state: State }>("select state from plateau_rooms where code=$1 for update", [code.toUpperCase()]);
    if (!rows.length) { await c.query("rollback"); return err(404, "Partie introuvable."); }
    const s = rows[0].state;
    const before = s.v;
    advance(s, Date.now(), secureRand());
    const out = (await fn(s, c)) ?? { status: 200, body: { ok: true } };
    if (s.v !== before && s.v > 0) {
      await c.query("update plateau_rooms set state=$2, phase=$3, updated_at=now() where code=$1", [s.code, JSON.stringify(s), s.phase]);
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

/** Existe-t-il une partie de plateau avec ce code ? (le champ « Rejoindre » de l'Arène accepte les deux) */
export async function estPlateau(code: string) {
  return (await q("select 1 from plateau_rooms where code=$1", [code.toUpperCase()])).length > 0;
}

export async function createRoom(userId: string, groupId: string): Promise<Res> {
  if (!(await memberRole(groupId, userId))) return err(403, "Tu n'es pas membre de ce groupe.");
  const { themes } = await themesDuGroupe(groupId);
  if (!themes.length) return err(409, "Pas encore de question disponible : le plateau utilise les quiz des jours passés. Jouez d'abord quelques quiz du jour.");
  await q(`delete from plateau_rooms where updated_at < now() - ($1 || ' hours')::interval`, [String(ARENA.PURGE_APRES_H)]);
  const s0 = { id: userId, name: await pseudo(userId) };
  for (let i = 0; i < 8; i++) {
    const code = genCode();
    if ((await q("select 1 from arena_rooms where code=$1", [code])).length) continue; // un code ne désigne qu'une seule partie
    const s = newState(code, groupId, s0);
    const ins = await q("insert into plateau_rooms(code,group_id,host_id,state) values ($1,$2,$3,$4) on conflict do nothing returning code",
      [code, groupId, userId, JSON.stringify(s)]);
    if (ins.length) return { status: 200, body: { code } };
  }
  return err(500, "Impossible de créer la partie, réessaie.");
}

export async function joinRoom(userId: string, code: string): Promise<Res> {
  const name = await pseudo(userId);
  return withRoom(code, async (s) => {
    if (!(await memberRole(s.groupId, userId))) return err(403, "Cette partie est réservée aux membres du groupe.");
    const p = s.joueurs.find((x) => x.id === userId);
    if (p) { if (p.left) { p.left = false; s.v += 1; } return { status: 200, body: { code: s.code } }; }
    if (s.phase !== "lobby") return err(409, "La partie a déjà commencé.");
    if (s.joueurs.length >= PLATEAU.MAX_JOUEURS) return err(409, "Partie complète.");
    s.joueurs.push(joueur(userId, name, false, 0));
    s.v += 1;
    return { status: 200, body: { code: s.code } };
  });
}

export async function addBot(userId: string, code: string): Promise<Res> {
  return withRoom(code, (s) => {
    if (s.host !== userId || s.phase !== "lobby") return err(403, "Réservé à l'hôte, avant le lancement.");
    if (s.joueurs.length >= PLATEAU.MAX_JOUEURS) return err(409, "Partie complète.");
    const libres = ARENA.BOTS.filter((b) => !s.joueurs.some((p) => p.id === `bot:${b}`));
    if (!libres.length) return err(409, "Plus de bot disponible.");
    const b = libres[crypto.randomInt(libres.length)];
    s.joueurs.push(joueur(`bot:${b}`, `${b} (bot)`, true, 0.45 + crypto.randomInt(45) / 100));
    s.v += 1;
  });
}

export async function startRoom(userId: string, code: string): Promise<Res> {
  return withRoom(code, async (s) => {
    if (s.host !== userId || s.phase !== "lobby") return err(403, "Seul l'hôte peut lancer la partie.");
    const { themes, pools } = await themesDuGroupe(s.groupId);
    if (!themes.length) return err(409, "Aucune question disponible.");
    // ordre de passage tiré au sort
    const rand = secureRand();
    for (let i = s.joueurs.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [s.joueurs[i], s.joueurs[j]] = [s.joueurs[j], s.joueurs[i]]; }
    startGame(s, themes, pools, Date.now(), rand);
    s.v += 1;
  });
}

export async function rollRoom(userId: string, code: string): Promise<Res> {
  return withRoom(code, (s) => {
    const r = actionLancer(s, userId, Date.now(), secureRand());
    if (!r.ok) return err(409, r.error);
  });
}

export async function answerRoom(userId: string, code: string, choice: unknown): Promise<Res> {
  return withRoom(code, (s) => {
    const r = actionRepondre(s, userId, choice, Date.now());
    if (!r.ok) return err(409, r.error);
  });
}

export async function leaveRoom(userId: string, code: string): Promise<Res> {
  return withRoom(code, async (s, c) => {
    const i = s.joueurs.findIndex((p) => p.id === userId);
    if (i < 0) return;
    if (s.phase === "lobby") {
      s.joueurs.splice(i, 1);
      const humains = s.joueurs.filter((p) => !p.bot);
      if (!humains.length) { await c.query("delete from plateau_rooms where code=$1", [s.code]); s.v = -1; return; }
      if (s.host === userId) s.host = humains[0].id;
    } else {
      s.joueurs[i].left = true;
      if (s.host === userId) s.host = s.joueurs.find((p) => !p.bot && !p.left)?.id ?? s.host;
      // plus aucun humain : la partie s'arrête (les bots ne jouent pas seuls indéfiniment)
      if (!s.joueurs.some((p) => !p.bot && !p.left)) s.phase = "final";
      advance(s, Date.now(), secureRand());
    }
    s.v += 1;
  });
}

export async function roomState(userId: string, code: string, since: number): Promise<Res> {
  return withRoom(code, (s) => {
    if (!s.joueurs.some((p) => p.id === userId)) return err(403, "Tu n'es pas dans cette partie.");
    if (since === s.v) return { status: 200, body: { nochange: true, now: Date.now() } };
    return { status: 200, body: viewFor(s, userId, Date.now()) };
  });
}

export async function openRooms(groupIds: string[]) {
  if (!groupIds.length) return [];
  const rows = await q<{ code: string; state: State }>(
    `select code, state from plateau_rooms
      where group_id = any($1::uuid[]) and phase='lobby' and updated_at > now() - interval '30 minutes' order by created_at desc limit 20`, [groupIds]);
  return rows.map((r) => ({
    code: r.code, hote: r.state.joueurs.find((p) => p.id === r.state.host)?.name ?? "?", joueurs: r.state.joueurs.length,
  }));
}
