import { q } from "./db";
import { classementCumule, type CumulRanked } from "./scoring";
import { todayParis } from "./clock";

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
  const today = await todayParis();
  const rows = await q<CumulRow>(
    `select ${CUMUL_SELECT}
       from group_members gm
       join profiles p on p.id=gm.user_id
       left join (select r.* from daily_results r join game_days g on g.id=r.game_day_id join subjects s on s.id=g.subject_id
                   where s.group_id=$1 and g.date <= $2::date) r on r.user_id=p.id
      where gm.group_id=$1 group by p.id, p.pseudo`, [groupId, today]);
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
  const today = await todayParis();
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
  const today = await todayParis();
  return q(
    `select r.game_day_id as "dayId", to_char(g.date,'YYYY-MM-DD') as date, r.user_id as "userId",
            r.rang, r.erreurs, r.duree_ms::float8 as "dureeMs"
       from daily_results r join game_days g on g.id=r.game_day_id join subjects s on s.id=g.subject_id
      where s.group_id=$1 and g.date <= $2::date`, [groupId, today]);
}
