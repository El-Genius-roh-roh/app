"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getSubjectFor } from "@/lib/subjects";
import { deleteQuestion, saveQuestion } from "@/lib/quiz/manual";

export type QState = { ok?: boolean; erreur?: string; n?: number } | null;

async function manager(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("subject") ?? "");
  const c = await getSubjectFor(id, user.id);
  return c?.canManage ? id : null;
}

export async function enregistrerQuestion(prev: QState, fd: FormData): Promise<QState> {
  const id = await manager(fd);
  if (!id) return { erreur: "Action réservée aux gestionnaires de la matière." };
  const type = fd.get("type") === "vrai_faux" ? "vrai_faux" : "qcm";
  const doc = String(fd.get("document") ?? "");
  const err = await saveQuestion(id, {
    id: String(fd.get("question") ?? "") || undefined,
    dayId: String(fd.get("day") ?? ""),
    type,
    enonce: String(fd.get("enonce") ?? ""),
    choix: [0, 1, 2, 3].map((i) => String(fd.get(`choix${i}`) ?? "")),
    correct_index: Number(fd.get(type === "vrai_faux" ? "bonne_vf" : "bonne")),
    explication: String(fd.get("explication") ?? ""),
    documentId: doc || undefined,
    page: Number(fd.get("page")) || 1,
  });
  if (err) return { erreur: err, n: (prev?.n ?? 0) + 1 };
  revalidatePath(`/matieres/${id}/questions`);
  return { ok: true, n: (prev?.n ?? 0) + 1 };
}

export async function supprimerQuestion(fd: FormData) {
  const id = await manager(fd);
  if (!id) return;
  await deleteQuestion(id, String(fd.get("day") ?? ""), String(fd.get("question") ?? ""));
  revalidatePath(`/matieres/${id}/questions`);
}
