"use server";
import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { STORAGE } from "@/lib/ingest";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";

export async function creerMatiere(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("group") ?? "");
  // tout membre peut créer une matière (D43) : il en devient le gestionnaire
  if (!(await memberRole(id, user.id))) redirect(`/groupes/${id}`);
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

export async function renommerGroupe(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("group") ?? "");
  const nom = String(fd.get("nom") ?? "").trim().slice(0, 80);
  if ((await memberRole(id, user.id)) !== "admin" || !nom) return;
  await q("update groups set nom=$2 where id=$1", [id, nom]);
  revalidatePath(`/groupes/${id}`);
}

export async function supprimerGroupe(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("group") ?? "");
  if ((await memberRole(id, user.id)) !== "admin") return;
  const docs = await q<{ id: string; fichier_path: string }>(
    "select d.id,d.fichier_path from documents d join subjects s on s.id=d.subject_id where s.group_id=$1", [id]);
  await q("delete from groups where id=$1", [id]); // cascade : membres, matières et tout leur contenu, arène
  for (const d of docs) {
    fs.rmSync(d.fichier_path, { force: true });
    fs.rmSync(path.join(STORAGE, "pages", d.id), { recursive: true, force: true });
  }
  redirect("/");
}
