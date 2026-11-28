// Accès aux jeux (D45, remplace le premium D42) : l'Arène, le jeu de plateau, le Memory et Relier ne s'ouvrent qu'une
// fois les défis du jour joués (toutes les matières du joueur). Les flashcards et le glossaire restent ouverts : ils
// servent à réviser avant le défi. Sans défi aujourd'hui, tout est ouvert.
import { q } from "./db";
import { sqlToday } from "./clock";

export type AccesJeux = { ouvert: boolean; restants: number; prochain: { dayId: string; matiere: string } | null };

/** Défis du jour pas encore terminés par le joueur (une tentative en cours ne compte pas comme faite). */
export async function accesJeux(userId: string): Promise<AccesJeux> {
  const rows = await q<{ day_id: string; matiere: string }>(
    `select gd.id as day_id, s.nom as matiere
       from subjects s join group_members m on m.group_id=s.group_id and m.user_id=$1
       join game_days gd on gd.subject_id=s.id and gd.date = ${sqlToday("s.id")}
      where not exists (select 1 from attempts a where a.game_day_id=gd.id and a.user_id=$1 and a.statut <> 'en_cours')
      order by s.created_at`, [userId]);
  return { ouvert: rows.length === 0, restants: rows.length, prochain: rows[0] ? { dayId: rows[0].day_id, matiere: rows[0].matiere } : null };
}

export const MESSAGE_VERROU = "Joue d'abord ton défi du jour : les jeux s'ouvrent ensuite.";
