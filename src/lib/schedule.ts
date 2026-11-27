import { q, pool } from "./db";
import { addDays, todayParis } from "./clock";
import { splitIntoDays } from "./split";

/**
 * (Re)calcule le programme de toutes les saisons d'une matière (D13 : chaque saison reprend tout le cours).
 * Jours passés, jour en cours ayant déjà un programme, jours figés ou déjà générés : jamais modifiés.
 */
export async function rebuildSchedule(subjectId: string) {
  const [s] = await q<{ date_debut: string; jours_par_saison: number; nb_saisons: number }>(
    "select to_char(date_debut,'YYYY-MM-DD') as date_debut, jours_par_saison, nb_saisons from subjects where id=$1", [subjectId]);
  if (!s) return;
  const today = await todayParis(subjectId);
  const pages = await q<{ id: string; densite: number; chapitre: string | null }>(
    `select p.id, coalesce(p.densite,0) as densite, p.chapitre
       from document_pages p join documents d on d.id=p.document_id
      where d.subject_id=$1 and d.categorie='cours' and d.statut='pret'
      order by d.ordre, d.created_at, p.numero`, [subjectId]);

  const client = await pool.connect();
  try {
    await client.query("begin");
    for (let saison = 1; saison <= s.nb_saisons; saison++) {
      const debut = addDays(s.date_debut, (saison - 1) * s.jours_par_saison);
      for (let j = 1; j <= s.jours_par_saison; j++) {
        await client.query(
          "insert into game_days(subject_id,saison,jour_dans_saison,date) values ($1,$2,$3,$4) on conflict (subject_id,saison,jour_dans_saison) do update set date=excluded.date",
          [subjectId, saison, j, addDays(debut, j - 1)]);
      }
      const { rows: days } = await client.query<{ id: string; date: string; fige: boolean; statut_generation: string; nb: string }>(
        `select g.id, to_char(g.date,'YYYY-MM-DD') as date, g.fige, g.statut_generation,
                (select count(*) from game_day_pages x where x.game_day_id=g.id) as nb
           from game_days g where g.subject_id=$1 and g.saison=$2 order by g.jour_dans_saison`, [subjectId, saison]);
      const locked = (d: (typeof days)[number]) =>
        d.date < today || d.fige || d.statut_generation === "ok" || (d.date === today && Number(d.nb) > 0);
      const future = days.filter((d) => !locked(d));
      if (future.length === 0) continue;

      const lockedIds = days.filter(locked).map((d) => d.id);
      const { rows: used } = lockedIds.length
        ? await client.query<{ page_id: string }>("select page_id from game_day_pages where game_day_id = any($1)", [lockedIds])
        : { rows: [] as { page_id: string }[] };
      const usedSet = new Set(used.map((u) => u.page_id));
      const remaining = pages.filter((p) => !usedSet.has(p.id));

      await client.query("delete from game_day_pages where game_day_id = any($1)", [future.map((d) => d.id)]);
      const split = splitIntoDays(remaining, future.length);
      for (let i = 0; i < future.length; i++) {
        for (const pid of split[i]) {
          await client.query("insert into game_day_pages(game_day_id,page_id) values ($1,$2)", [future[i].id, pid]);
        }
      }
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
