"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";

export async function creerMatiere(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("group") ?? "");
  if ((await memberRole(id, user.id)) !== "admin") redirect(`/groupes/${id}`);
  const nom = String(fd.get("nom") ?? "").trim();
  const debut = String(fd.get("date_debut") ?? "");
  const jours = Math.max(1, Math.min(120, Number(fd.get("jours")) || 30));
  const saisons = Math.max(1, Math.min(10, Number(fd.get("saisons")) || 1));
  if (!nom || !/^\d{4}-\d{2}-\d{2}$/.test(debut)) redirect(`/groupes/${id}`);
  const [s] = await q<{ id: string }>(
    "insert into subjects(group_id,nom,created_by,date_debut,jours_par_saison,nb_saisons) values ($1,$2,$3,$4,$5,$6) returning id",
    [id, nom, user.id, debut, jours, saisons]);
  await q("insert into subject_players(subject_id,user_id) select $1,user_id from group_members where group_id=$2", [s.id, id]);
  redirect(`/matieres/${s.id}`);
}
