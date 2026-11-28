"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { NOTIONS } from "@/config/constants";
import { lancerExtraction } from "@/lib/notions-extraction";

/** Notions du cours (D39) : réservé aux gestionnaires de la matière, droit vérifié à chaque action. */
async function manager(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("subject") ?? "");
  const c = await getSubjectFor(id, user.id);
  return c?.canManage ? id : null;
}

const propre = (fd: FormData, k: string) => String(fd.get(k) ?? "").replace(/\s+/g, " ").trim();

/** Ajoute ou corrige une notion. Une notion corrigée devient « manuelle » : une nouvelle extraction ne la touche plus. */
export async function enregistrerNotion(fd: FormData) {
  const id = await manager(fd);
  if (!id) return;
  const terme = propre(fd, "terme").slice(0, NOTIONS.TERME_MAX);
  const definition = propre(fd, "definition").slice(0, NOTIONS.DEFINITION_MAX);
  if (!terme || definition.length < 3) return;
  const notion = String(fd.get("notion") ?? "");
  if (notion) await q("update notions set terme=$3, definition=$4, source='manuelle' where id=$2 and subject_id=$1", [id, notion, terme, definition]);
  else await q("insert into notions(subject_id,terme,definition,source) values ($1,$2,$3,'manuelle')", [id, terme, definition]);
  revalidatePath(`/matieres/${id}/notions`);
}

export async function supprimerNotion(fd: FormData) {
  const id = await manager(fd);
  if (!id) return;
  await q("delete from notions where id=$2 and subject_id=$1", [id, String(fd.get("notion") ?? "")]);
  revalidatePath(`/matieres/${id}/notions`);
}

/** Relance l'extraction sur tous les cours importés (en tâche de fond ; les notions manuelles sont gardées). */
export async function extraireNotions(fd: FormData) {
  const id = await manager(fd);
  if (!id) return;
  lancerExtraction(id);
  revalidatePath(`/matieres/${id}/notions`);
}
