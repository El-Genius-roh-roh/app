// Activités solo (D37) : sessions terminées de flashcards, de Memory et d'Arène contre des bots.
// Chaque session rapporte SOLO.GEMMES_PAR_SESSION gemmes solo, plafonnées à SOLO.MAX_PAR_JOUR par jour et par groupe,
// qui s'ajoutent au score de la semaine (trophées hebdomadaires, D36). Le plafond s'applique au calcul, pas à l'écriture.
import { SOLO } from "@/config/constants";
import { q } from "./db";

export type TypeSolo = (typeof SOLO.TYPES)[number];

/** Gemmes solo d'un jour pour `n` sessions. */
export const gemmesSolo = (n: number) => Math.min(n * SOLO.GEMMES_PAR_SESSION, SOLO.MAX_PAR_JOUR);

/** Enregistre une session et renvoie les gemmes solo gagnées ce jour-là dans le groupe (après plafond). */
export async function enregistrerSolo(o: { userId: string; groupId: string; subjectId: string | null; type: TypeSolo; date: string }) {
  const [{ n: avant }] = await q<{ n: number }>(
    "select count(*)::int as n from solo_sessions where user_id=$1 and group_id=$2 and date=$3::date", [o.userId, o.groupId, o.date]);
  await q("insert into solo_sessions(user_id,group_id,subject_id,type,date) values ($1,$2,$3,$4,$5::date)",
    [o.userId, o.groupId, o.subjectId, o.type, o.date]);
  return { gagne: gemmesSolo(avant + 1) - gemmesSolo(avant), aujourdhui: gemmesSolo(avant + 1), max: SOLO.MAX_PAR_JOUR };
}

/** Sessions solo d'un joueur aux dates données (une par groupe ou matière en démo), par type : défis du jour. */
export async function soloDuJour(userId: string, dates: string[]): Promise<Record<TypeSolo, number>> {
  const rows = await q<{ type: TypeSolo; n: number }>(
    "select type, count(*)::int as n from solo_sessions where user_id=$1 and date = any($2::date[]) group by type", [userId, dates]);
  return Object.fromEntries(SOLO.TYPES.map((t) => [t, rows.find((r) => r.type === t)?.n ?? 0])) as Record<TypeSolo, number>;
}
