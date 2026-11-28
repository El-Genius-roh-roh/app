import { q } from "./db";
import { CONFIG } from "@/config/constants";
import { classementCumule, type CumulRanked } from "./scoring";
import { sqlToday, todayGroupe, todayParis } from "./clock";
import { tropheesFinSaison } from "./trophees";

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

/* ------------------------------------------------------------------ trophées de fin de saison (D30), ligue unique (D47) */

export type SaisonTrophees = {
  subjectId: string; matiere: string; saison: number; nbJours: number; debut: string; fin: string;
  /** Saison finie : trophées acquis. Sinon : trophées que chacun gagnerait si la saison s'arrêtait aujourd'hui. */
  terminee: boolean;
  /** Classement aux gemmes, parmi les joueurs qui ont joué au moins un jeu du jour de la saison. */
  classement: (CumulLine & { trophees: number })[];
};
/** `trophees` = trophées gagnés dans les matières du groupe ; `total` = tous groupes confondus (il fixe la ligue). */
export type TropheeLine = { userId: string; pseudo: string; trophees: number; total: number; rang: number };
export type TropheesGroupe = { today: string; lignes: TropheeLine[]; saisons: SaisonTrophees[] };

/** Rang « 1, 2, 2, 4 » selon une valeur décroissante. */
function rangs<T extends { userId: string; pseudo: string }>(rows: (T & { v: number })[]) {
  return [...rows]
    .sort((a, b) => b.v - a.v || a.pseudo.localeCompare(b.pseudo))
    .map((r) => ({ ...r, rang: 1 + rows.filter((o) => o.v > r.v).length }));
}

/** Saison d'une matière : classement aux gemmes et trophées de fin de saison (acquis ou en jeu). */
export async function getSaisonTrophees(subjectId: string, matiere: string, s: SeasonInfo): Promise<SaisonTrophees> {
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from game_days where subject_id=$1 and saison=$2", [subjectId, s.saison]);
  const joueurs = classementCumule((await getSeasonRanking(subjectId, s.saison)).filter((l) => l.jours > 0));
  const t = tropheesFinSaison(joueurs, n);
  return { subjectId, matiere, saison: s.saison, nbJours: n, debut: s.debut, fin: s.fin, terminee: s.termine,
    classement: joueurs.map((l) => ({ ...l, trophees: t.get(l.userId) ?? 0 })) };
}

/** Saisons commencées des matières données (les terminées seulement avec `terminees`). */
async function saisonsDe(matieres: { id: string; nom: string }[], terminees = false): Promise<SaisonTrophees[]> {
  const out: SaisonTrophees[] = [];
  for (const m of matieres) {
    const today = await todayParis(m.id);
    for (const s of await getSeasons(m.id)) {
      if (s.debut > today || (terminees && !s.termine)) continue;
      out.push(await getSaisonTrophees(m.id, m.nom, s));
    }
  }
  return out;
}

const somme = (saisons: SaisonTrophees[]) => {
  const total = new Map<string, number>();
  for (const s of saisons) if (s.terminee) for (const l of s.classement) total.set(l.userId, (total.get(l.userId) ?? 0) + l.trophees);
  return total;
};

/** Trophées de chaque joueur, toutes matières de tous ses groupes (saisons terminées) : ils fixent sa ligue, unique. */
export async function tropheesTotaux(userIds: string[]): Promise<Map<string, number>> {
  if (!userIds.length) return new Map();
  const matieres = await q<{ id: string; nom: string }>(
    `select distinct s.id, s.nom from subjects s join group_members gm on gm.group_id=s.group_id where gm.user_id = any($1::uuid[])`, [userIds]);
  const total = somme(await saisonsDe(matieres, true));
  return new Map(userIds.map((u) => [u, total.get(u) ?? 0]));
}

/** Trophées des membres d'un groupe : gagnés dans ses matières (saisons terminées), et total pour la ligue. */
export async function getGroupTrophees(groupId: string): Promise<TropheesGroupe> {
  const membres = await q<{ userId: string; pseudo: string }>(
    `select p.id as "userId", coalesce(p.pseudo,'?') as pseudo from group_members gm join profiles p on p.id=gm.user_id where gm.group_id=$1`, [groupId]);
  const matieres = await q<{ id: string; nom: string }>("select id, nom from subjects where group_id=$1 order by created_at", [groupId]);
  const saisons = await saisonsDe(matieres);
  const groupe = somme(saisons);
  const totaux = await tropheesTotaux(membres.map((m) => m.userId));
  const lignes = rangs(membres.map((m) => ({ ...m, v: groupe.get(m.userId) ?? 0 })))
    .map(({ v, ...m }) => ({ ...m, trophees: v, total: totaux.get(m.userId) ?? 0 }));
  return { today: await todayGroupe(groupId), lignes, saisons };
}

/** Ligue d'un joueur (D47) : ses trophées acquis (saisons terminées) et ceux en jeu dans les saisons en cours. */
export async function tropheesDuJoueur(userId: string): Promise<{ total: number; enJeu: number }> {
  const matieres = await q<{ id: string; nom: string }>(
    `select s.id, s.nom from subjects s join group_members gm on gm.group_id=s.group_id where gm.user_id=$1`, [userId]);
  let total = 0, enJeu = 0;
  for (const s of await saisonsDe(matieres)) {
    const t = s.classement.find((l) => l.userId === userId)?.trophees ?? 0;
    if (s.terminee) total += t; else enJeu += t;
  }
  return { total, enJeu };
}
