// Activités solo (D37, D47) : sessions terminées de flashcards, de Memory, de Relier et d'Arène contre des bots.
// Elles comptent pour les succès et les défis du tableau de bord ; elles ne rapportent ni gemmes ni trophées.
import { SOLO } from "@/config/constants";
import { q } from "./db";

export type TypeSolo = (typeof SOLO.TYPES)[number];

/** Enregistre une session et renvoie le nombre de sessions du joueur ce jour-là dans le groupe. */
export async function enregistrerSolo(o: { userId: string; groupId: string; subjectId: string | null; type: TypeSolo; date: string }) {
  await q("insert into solo_sessions(user_id,group_id,subject_id,type,date) values ($1,$2,$3,$4,$5::date)",
    [o.userId, o.groupId, o.subjectId, o.type, o.date]);
  const [{ n }] = await q<{ n: number }>(
    "select count(*)::int as n from solo_sessions where user_id=$1 and group_id=$2 and date=$3::date", [o.userId, o.groupId, o.date]);
  return { sessions: n };
}

/** Sessions solo d'un joueur aux dates données (une par groupe ou matière en démo), par type : défis du jour. */
export async function soloDuJour(userId: string, dates: string[]): Promise<Record<TypeSolo, number>> {
  const rows = await q<{ type: TypeSolo; n: number }>(
    "select type, count(*)::int as n from solo_sessions where user_id=$1 and date = any($2::date[]) group by type", [userId, dates]);
  return Object.fromEntries(SOLO.TYPES.map((t) => [t, rows.find((r) => r.type === t)?.n ?? 0])) as Record<TypeSolo, number>;
}
