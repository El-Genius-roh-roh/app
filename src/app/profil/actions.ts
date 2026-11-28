"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { removeAvatar, saveAvatar } from "@/lib/avatar";

export type PhotoState = { erreur?: string; ok?: boolean } | null;

export async function envoyerPhoto(_: PhotoState, fd: FormData): Promise<PhotoState> {
  const u = await getUser();
  if (!u) redirect("/login");
  const f = fd.get("photo");
  if (!(f instanceof File)) return { erreur: "Choisis une image." };
  const err = await saveAvatar(u.id, f);
  if (err) return { erreur: err };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function retirerPhoto() {
  const u = await getUser();
  if (!u) redirect("/login");
  await removeAvatar(u.id);
  revalidatePath("/", "layout");
}
