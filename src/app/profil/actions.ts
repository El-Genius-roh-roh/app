"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { removeAvatar, saveAvatar } from "@/lib/avatar";
import { q } from "@/lib/db";

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

/**
 * Premium (D42) : pas encore de paiement. En démo (DEMO_MODE=1) seulement, chacun active ou retire le premium de son
 * propre compte ; hors démo, l'action ne fait rien (le premium se donne alors en base).
 */
export async function basculerPremium(fd: FormData) {
  const u = await getUser();
  if (!u) redirect("/login");
  if (process.env.DEMO_MODE !== "1") return;
  await q("update profiles set premium=$2 where id=$1", [u.id, fd.get("premium") === "1"]);
  revalidatePath("/", "layout");
}

export async function retirerPhoto() {
  const u = await getUser();
  if (!u) redirect("/login");
  await removeAvatar(u.id);
  revalidatePath("/", "layout");
}
