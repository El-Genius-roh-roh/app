import { q } from "./db";
import { CONFIG } from "@/config/constants";
import { classementCumule, type CumulRanked } from "./scoring";
import { sqlToday, todayParis } from "./clock";
import { calculerTrophees, type JourJeu } from "./trophees";

export type CumulRow = { userId: string; pseudo: string; points: number; erreurs: number; dureeMs: number; jours: number };
export type CumulLine = CumulRanked<CumulRow>;

const CUMUL_SELECT = `p.id as "userId", p.pseudo,
  coalesce(sum(r.points),0)::int as points, coalesce(sum(r.erreurs),0)::int as erreurs,
  coalesce(sum(r.duree_ms),0)::float8 as "dureeMs", count(r.game_day_id)::int as jours`;

/** Classement de saison d'une matière : tous les joueurs de la matière, 0 point s'ils n'ont pas joué. */
export async function getSeasonRanking(subjectId: string, saison: number): Promise<CumulLine[]> {
  const rows = await q<CumulRow>(
    `select ${CUMUL_SELECT}
       from subjects s
       join group_members gm on gm.group_id=s.group_id
       join subject_players sp on sp.subject_id=s.id and sp.user_id=gm.user_id and sp.actif
       join profiles p on p.id=gm.user_id
       left join (select r.* from daily_results r join game_days g on g.id=r.game_day_id where g.subject_id=$1 and g.saison=$2) r on r.user_id=p.id
      where s.id=$1 group by p.id, p.pseudo`, [subjectId, saison]);
  return classementCumule(rows);
}

/** Classement général d'un groupe : somme de toutes les matières, depuis le début. */
export async function getGroupRanking(groupId: string): Promise<CumulLine[]> {
  const rows = await q<CumulRow>(
    `select ${CUMUL_SELECT}
       from group_members gm
       join profiles p on p.id=gm.user_id
       left join (select r.* from daily_results r join game_days g on g.id=r.game_day_id join subjects s on s.id=g.subject_id
                   where s.group_id=$1 and g.date <= ${sqlToday("g.subject_id")}) r on r.user_id=p.id
      where gm.group_id=$1 group by p.id, p.pseudo`, [groupId]);
  return classementCumule(rows);
}

export type DayLine = { userId: string; pseudo: string; rang: number; erreurs: number; dureeMs: number; battus: number; points: number };
export type DayRanking = { dayId: string; date: string; saison: number; jour: number; fige: boolean; lines: DayLine[]; absents: string[] };

export async function getDayRanking(dayId: string): Promise<DayRanking | null> {
  const [g] = await q<{ id: string; date: string; saison: number; jour: number; fige: boolean; subject_id: string; group_id: string }>(
    `select g.id, to_char(g.date,'YYYY-MM-DD') as date, g.saison, g.jour_dans_saison as jour, g.fige, g.subject_id, s.group_id
       from game_days g join subjects s on s.id=g.subject_id where g.id=$1`, [dayId]);
  if (!g) return null;
  const lines = await q<DayLine>(
    `select r.user_id as "userId", p.pseudo, r.rang, r.erreurs, r.duree_ms::float8 as "dureeMs", r.joueurs_battus as battus, r.points
       from daily_results r join profiles p on p.id=r.user_id where r.game_day_id=$1 order by r.rang, r.erreurs, r.duree_ms, p.pseudo`, [dayId]);
  const absents = (await q<{ pseudo: string }>(
    `select p.pseudo from group_members gm join profiles p on p.id=gm.user_id
      join subject_players sp on sp.subject_id=$2 and sp.user_id=gm.user_id and sp.actif
      where gm.group_id=$3 and not exists (select 1 from daily_results r where r.game_day_id=$1 and r.user_id=gm.user_id) order by p.pseudo`,
    [dayId, g.subject_id, g.group_id])).map((r) => r.pseudo);
  return { dayId, date: g.date, saison: g.saison, jour: g.jour, fige: g.fige, lines, absents };
}

export type SeasonInfo = { saison: number; debut: string; fin: string; termine: boolean; courante: boolean };

export async function getSeasons(subjectId: string): Promise<SeasonInfo[]> {
  const today = await todayParis(subjectId);
  const rows = await q<{ saison: number; debut: string; fin: string }>(
    `select saison, to_char(min(date),'YYYY-MM-DD') as debut, to_char(max(date),'YYYY-MM-DD') as fin from game_days where subject_id=$1 group by saison order by saison`, [subjectId]);
  return rows.map((r) => ({ ...r, termine: r.fin < today, courante: r.debut <= today && today <= r.fin }));
}

/** Saison à afficher par défaut : la courante, sinon la prochaine à venir, sinon la dernière. */
export function defaultSeason(seasons: SeasonInfo[], today: string): number {
  return (seasons.find((s) => s.courante) ?? seasons.find((s) => s.debut > today) ?? seasons[seasons.length - 1])?.saison ?? 1;
}

/** Jour à afficher pour une saison : aujourd'hui s'il en fait partie, sinon le dernier jour où quelqu'un a joué. */
export async function pickDay(subjectId: string, saison: number, today: string): Promise<string | null> {
  const [d] = await q<{ id: string }>(
    `select id from game_days where subject_id=$1 and saison=$2 and date <= $3::date
      order by (date = $3::date) desc, exists (select 1 from daily_results r where r.game_day_id=game_days.id) desc, date desc limit 1`, [subjectId, saison, today]);
  return d?.id ?? null;
}

/** Tous les résultats quotidiens d'un groupe (toutes matières), jusqu'à aujourd'hui : base des trophées. */
export async function getGroupResults(groupId: string): Promise<import("./trophees").Resultat[]> {
  return q(
    `select r.game_day_id as "dayId", to_char(g.date,'YYYY-MM-DD') as date, r.user_id as "userId",
            r.rang, r.erreurs, r.duree_ms::float8 as "dureeMs"
       from daily_results r join game_days g on g.id=r.game_day_id join subjects s on s.id=g.subject_id
      where s.group_id=$1 and g.date <= ${sqlToday("g.subject_id")}`, [groupId]);
}

export type HistoryPlayer = { userId: string; pseudo: string; points: (number | null)[]; scores: (number | null)[] };
export type SeasonHistory = { jours: { jour: number; date: string }[]; joueurs: HistoryPlayer[] };

/** Évolution jour par jour d'une saison (jours passés et aujourd'hui) : points et bonnes réponses de chaque joueur, null si absent. */
/** `deltas` : trophées gagnés/perdus par jour (getGroupTrophees) ; la courbe « cumul » montre les trophées de la saison. */
export async function getSeasonHistory(subjectId: string, saison: number, deltas?: Map<string, Map<string, number>>): Promise<SeasonHistory> {
  const today = await todayParis(subjectId);
  const jours = await q<{ id: string; jour: number; date: string }>(
    `select id, jour_dans_saison as jour, to_char(date,'YYYY-MM-DD') as date from game_days
      where subject_id=$1 and saison=$2 and date <= $3::date order by date`, [subjectId, saison, today]);
  const players = await q<{ userId: string; pseudo: string }>(
    `select p.id as "userId", p.pseudo from subjects s join group_members gm on gm.group_id=s.group_id
       join subject_players sp on sp.subject_id=s.id and sp.user_id=gm.user_id and sp.actif
       join profiles p on p.id=gm.user_id where s.id=$1 order by lower(p.pseudo), p.id`, [subjectId]);
  const res = await q<{ dayId: string; userId: string; points: number; erreurs: number }>(
    `select r.game_day_id as "dayId", r.user_id as "userId", r.points, r.erreurs from daily_results r
      where r.game_day_id = any($1)`, [jours.map((j) => j.id)]);
  const idx = new Map(jours.map((j, i) => [j.id, i]));
  const joueurs = new Map(players.map((p) => [p.userId, { ...p, points: jours.map(() => null as number | null), scores: jours.map(() => null as number | null) }]));
  for (const r of res) {
    const pl = joueurs.get(r.userId), i = idx.get(r.dayId);
    if (!pl || i === undefined) continue;
    pl.points[i] = deltas ? (deltas.get(r.dayId)?.get(r.userId) ?? 0) : r.points;
    pl.scores[i] = CONFIG.QUESTIONS_PAR_JOUR - r.erreurs;
  }
  // absences pénalisées (−10 trophées) : visibles sur la courbe des trophées
  if (deltas) for (const [dayId, m] of deltas) {
    const i = idx.get(dayId);
    if (i === undefined) continue;
    for (const [u, d] of m) { const pl = joueurs.get(u); if (pl && pl.points[i] === null) pl.points[i] = d; }
  }
  return { jours: jours.map(({ jour, date }) => ({ jour, date })), joueurs: [...joueurs.values()] };
}

/* ------------------------------------------------------------------ trophées (façon Clash Royale) */

export type TropheeLine = { userId: string; pseudo: string; trophees: number; rang: number };
export type TropheesGroupe = {
  lignes: TropheeLine[];
  /** Variation de chaque quiz du jour : dayId → joueur → +/− trophées. */
  deltas: Map<string, Map<string, number>>;
};

/** Rang « 1, 2, 2, 4 » selon une valeur décroissante. */
function rangs<T extends { userId: string; pseudo: string }>(rows: (T & { v: number })[]) {
  return [...rows]
    .sort((a, b) => b.v - a.v || a.pseudo.localeCompare(b.pseudo))
    .map((r) => ({ ...r, rang: 1 + rows.filter((o) => o.v > r.v).length }));
}

/** Trophées de tous les membres d'un groupe, recalculés à partir de tous les quiz joués. */
export async function getGroupTrophees(groupId: string): Promise<TropheesGroupe> {
  const membres = await q<{ userId: string; pseudo: string }>(
    `select p.id as "userId", coalesce(p.pseudo,'?') as pseudo from group_members gm join profiles p on p.id=gm.user_id where gm.group_id=$1`, [groupId]);
  const jours = await q<{ dayId: string; date: string; subjectId: string; passe: boolean }>(
    `select g.id as "dayId", to_char(g.date,'YYYY-MM-DD') as date, g.subject_id as "subjectId", g.date < ${sqlToday("g.subject_id")} as passe
       from game_days g join subjects s on s.id=g.subject_id
      where s.group_id=$1 and g.date <= ${sqlToday("g.subject_id")}`, [groupId]);
  const res = await q<{ dayId: string; userId: string; erreurs: number; dureeMs: number }>(
    `select r.game_day_id as "dayId", r.user_id as "userId", r.erreurs, r.duree_ms::float8 as "dureeMs"
       from daily_results r where r.game_day_id = any($1)`, [jours.map((j) => j.dayId)]);
  const parJour = new Map<string, JourJeu["resultats"]>();
  for (const r of res) parJour.set(r.dayId, [...(parJour.get(r.dayId) ?? []), r]);
  const t = calculerTrophees(jours.map((j) => ({ ...j, resultats: parJour.get(j.dayId) ?? [] })), membres.map((m) => m.userId));
  const lignes = rangs(membres.map((m) => ({ ...m, v: t.total.get(m.userId) ?? 0 }))).map(({ v, ...m }) => ({ ...m, trophees: v }));
  return { lignes, deltas: t.deltas };
}

export type SaisonTropheeLine = { userId: string; pseudo: string; gain: number; rang: number };

/** Classement de saison d'une matière : trophées gagnés (ou perdus) pendant cette saison. */
export function classementSaisonTrophees(t: TropheesGroupe, dayIds: string[], joueurs: { userId: string; pseudo: string }[]): SaisonTropheeLine[] {
  const gain = (u: string) => dayIds.reduce((s, d) => s + (t.deltas.get(d)?.get(u) ?? 0), 0);
  return rangs(joueurs.map((j) => ({ ...j, v: gain(j.userId) }))).map(({ v, ...j }) => ({ ...j, gain: v }));
}
