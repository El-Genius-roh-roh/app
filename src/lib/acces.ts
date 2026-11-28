// Accès à l'Arène (D45, revu en D49) : l'Arène et le jeu de plateau ne s'ouvrent qu'une fois TOUS les jeux du jour
// joués (toutes les matières du joueur). Tout le reste (flashcards, Memory, Relier solo, glossaire, classements…)
// reste ouvert. Sans jeu du jour aujourd'hui, l'Arène est ouverte.
import { q } from "./db";
import { sqlToday } from "./clock";

export type AccesJeux = { ouvert: boolean; restants: number; prochain: { dayId: string; matiere: string } | null };

/** Jeux du jour pas encore terminés par le joueur (une tentative en cours ne compte pas comme faite). */
export async function accesJeux(userId: string): Promise<AccesJeux> {
  const rows = await q<{ day_id: string; matiere: string }>(
    `select gd.id as day_id, s.nom as matiere
       from subjects s join group_members m on m.group_id=s.group_id and m.user_id=$1
       join game_days gd on gd.subject_id=s.id and gd.date = ${sqlToday("s.id")}
      where not exists (select 1 from attempts a where a.game_day_id=gd.id and a.user_id=$1 and a.statut <> 'en_cours')
      order by s.created_at`, [userId]);
  return { ouvert: rows.length === 0, restants: rows.length, prochain: rows[0] ? { dayId: rows[0].day_id, matiere: rows[0].matiere } : null };
}

export const MESSAGE_VERROU = "Joue d'abord tous tes jeux du jour : l'Arène s'ouvre ensuite.";
