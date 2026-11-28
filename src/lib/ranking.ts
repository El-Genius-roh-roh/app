import { q } from "./db";
import { CONFIG, SOLO } from "@/config/constants";
import { classementCumule, type CumulRanked } from "./scoring";
import { sqlToday, todayGroupe, todayParis } from "./clock";
import { bilans, etatTrophees, type BilanSemaine, type EtatTrophees, type ScoreSemaine } from "./trophees";

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

export type DayLine = { userId: string; pseudo: string; rang: number; erreurs: number; dureeMs: number; battus: number; points: number; retard: number };
export type DayRanking = { dayId: string; date: string; saison: number; jour: number; fige: boolean; lines: DayLine[]; absents: string[] };

export async function getDayRanking(dayId: string): Promise<DayRanking | null> {
  const [g] = await q<{ id: string; date: string; saison: number; jour: number; fige: boolean; subject_id: string; group_id: string }>(
    `select g.id, to_char(g.date,'YYYY-MM-DD') as date, g.saison, g.jour_dans_saison as jour, g.fige, g.subject_id, s.group_id
       from game_days g join subjects s on s.id=g.subject_id where g.id=$1`, [dayId]);
  if (!g) return null;
  const lines = await q<DayLine>(
    `select r.user_id as "userId", p.pseudo, r.rang, r.erreurs, r.duree_ms::float8 as "dureeMs", r.joueurs_battus as battus, r.points, r.retard_jours as retard
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

/** Évolution jour par jour d'une saison (jours passés et aujourd'hui) : gemmes et bonnes réponses de chaque joueur, null si absent. */
export async function getSeasonHistory(subjectId: string, saison: number): Promise<SeasonHistory> {
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
    pl.points[i] = r.points;
    pl.scores[i] = CONFIG.QUESTIONS_PAR_JOUR - r.erreurs;
  }
  return { jours: jours.map(({ jour, date }) => ({ jour, date })), joueurs: [...joueurs.values()] };
}

/* ------------------------------------------------------------------ trophées de fin de saison (D30) */

/** `trophees` = semaines réglées ; `fige` fixe la ligue du mois ; `projection` inclut les semaines provisoires. */
export type TropheeLine = { userId: string; pseudo: string; trophees: number; rang: number } & EtatTrophees;
export type SaisonClassement = {
  subjectId: string; matiere: string; saison: number; nbJours: number; debut: string; fin: string; terminee: boolean;
  /** Classement aux gemmes, parmi les joueurs qui ont joué au moins un quiz de la saison. */
  classement: CumulLine[];
};
export type TropheesGroupe = { today: string; lignes: TropheeLine[]; semaines: BilanSemaine[] };

/** Rang « 1, 2, 2, 4 » selon une valeur décroissante. */
function rangs<T extends { userId: string; pseudo: string }>(rows: (T & { v: number })[]) {
  return [...rows]
    .sort((a, b) => b.v - a.v || a.pseudo.localeCompare(b.pseudo))
    .map((r) => ({ ...r, rang: 1 + rows.filter((o) => o.v > r.v).length }));
}

/** Saison d'une matière : classement aux gemmes (les trophées se gagnent à la semaine, D36). */
export async function getSaisonClassement(subjectId: string, matiere: string, s: SeasonInfo): Promise<SaisonClassement> {
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from game_days where subject_id=$1 and saison=$2", [subjectId, s.saison]);
  const classement = classementCumule((await getSeasonRanking(subjectId, s.saison)).filter((l) => l.jours > 0));
  return { subjectId, matiere, saison: s.saison, nbJours: n, debut: s.debut, fin: s.fin, terminee: s.termine, classement };
}

/**
 * Scores de chaque semaine (lundi → dimanche) dans un groupe, pour chaque membre (D36, D37) :
 * - gemmes des quiz du jour, comptées dans la semaine du quiz (un rattrapage compte pour sa semaine d'origine) ;
 * - gemmes solo : SOLO.GEMMES_PAR_SESSION par session, plafonnées à SOLO.MAX_PAR_JOUR par jour ;
 * - quiz manqués : quiz du jour d'une matière suivie, depuis l'arrivée dans le groupe, plus rattrapable et jamais terminé.
 */
export async function getScoresSemaines(groupId: string): Promise<ScoreSemaine[]> {
  const semaine = (col: string) => `to_char(date_trunc('week', ${col})::date,'YYYY-MM-DD')`;
  const rows = await q<{ semaine: string; userId: string; gemmes: number; solo: number; manques: number }>(
    `with gemmes as (
       select r.user_id, ${semaine("g.date")} as semaine, sum(r.points)::int as n
         from daily_results r join game_days g on g.id=r.game_day_id join subjects s on s.id=g.subject_id
        where s.group_id=$1 and g.date <= ${sqlToday("g.subject_id")} group by 1, 2),
     solo as (
       select user_id, ${semaine("d")} as semaine, sum(least(n * $2::int, $3::int))::int as n
         from (select user_id, date as d, count(*)::int as n from solo_sessions where group_id=$1 group by 1, 2) x group by 1, 2),
     manques as (
       select gm.user_id, ${semaine("g.date")} as semaine, count(*)::int as n
         from game_days g join subjects s on s.id=g.subject_id
         join subject_players sp on sp.subject_id=s.id and sp.actif
         join group_members gm on gm.group_id=s.group_id and gm.user_id=sp.user_id and gm.joined_at::date <= g.date
        where s.group_id=$1 and g.date < ${sqlToday("g.subject_id")} - $4::int
          and not exists (select 1 from daily_results r where r.game_day_id=g.id and r.user_id=gm.user_id)
        group by 1, 2)
     select k.semaine, k.user_id as "userId", coalesce(gemmes.n,0) as gemmes, coalesce(solo.n,0) as solo, coalesce(manques.n,0) as manques
       from (select user_id, semaine from gemmes union select user_id, semaine from solo union select user_id, semaine from manques) k
       left join gemmes using (user_id, semaine) left join solo using (user_id, semaine) left join manques using (user_id, semaine)`,
    [groupId, SOLO.GEMMES_PAR_SESSION, SOLO.MAX_PAR_JOUR, CONFIG.RATTRAPAGE_JOURS]);
  return rows;
}

/** Trophées de tous les membres d'un groupe : bilans des semaines, ligue fixée au dernier bilan de fin de mois (D36). */
export async function getGroupTrophees(groupId: string): Promise<TropheesGroupe> {
  const membres = await q<{ userId: string; pseudo: string }>(
    `select p.id as "userId", coalesce(p.pseudo,'?') as pseudo from group_members gm join profiles p on p.id=gm.user_id where gm.group_id=$1`, [groupId]);
  const today = await todayGroupe(groupId);
  const semaines = bilans(await getScoresSemaines(groupId), membres.map((m) => m.userId), today);
  const etats = new Map(membres.map((m) => [m.userId, etatTrophees(semaines, m.userId, today)]));
  const lignes = rangs(membres.map((m) => ({ ...m, v: etats.get(m.userId)!.courant })))
    .map(({ v, ...m }) => ({ ...m, trophees: v, ...etats.get(m.userId)! }));
  return { today, lignes, semaines };
}
