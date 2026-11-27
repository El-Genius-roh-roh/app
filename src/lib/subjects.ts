import { q } from "./db";
import { memberRole } from "./groups";

export type Subject = { id: string; nom: string; group_id: string; created_by: string; jours_par_saison: number; nb_saisons: number; date_debut: string; profil_examen: any };

export async function getSubjectFor(subjectId: string, userId: string) {
  const [s] = await q<Subject>(
    "select id,nom,group_id,created_by,jours_par_saison,nb_saisons,to_char(date_debut,'YYYY-MM-DD') as date_debut,profil_examen from subjects where id=$1", [subjectId]);
  if (!s) return null;
  const role = await memberRole(s.group_id, userId);
  if (!role) return null;
  return { subject: s, role, canManage: role === "admin" || s.created_by === userId };
}

/** « 4-7, 9 » à partir de numéros de pages. */
export function ranges(nums: number[]): string {
  const n = [...nums].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < n.length; ) {
    let j = i;
    while (j + 1 < n.length && n[j + 1] === n[j] + 1) j++;
    out.push(i === j ? `${n[i]}` : `${n[i]}-${n[j]}`);
    i = j + 1;
  }
  return out.join(", ");
}
