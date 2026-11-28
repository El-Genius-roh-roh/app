"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { addBot, createRoom } from "@/lib/arena/service";
import { realToday } from "@/lib/clock";
import { jeuDuJour } from "@/lib/jeu-du-jour";
import { ARENA, JEU_DU_JOUR } from "@/config/constants";

/**
 * Mini-jeu du jour (D40), quand c'est un jeu d'Arène (Quiz éclair, Vrai ou faux, Course) : crée la partie dans le mode
 * du jour avec des bots, puis ouvre la salle d'attente (on peut encore y inviter ses amis avant de lancer).
 * Le mode vient de la date, jamais du formulaire.
 */
export async function lancerJeuDuJour(form: FormData) {
  const u = await requireUser();
  const groupId = String(form.get("groupe") ?? "");
  const jeu = jeuDuJour(realToday());
  if (jeu.lieu !== "arene" || !/^[0-9a-f-]{36}$/i.test(groupId)) redirect("/arene#jeu-du-jour");
  const r = await createRoom(u.id, groupId, jeu.id, ARENA.NB_MANCHES_DEFAUT);
  const code = typeof r.body.code === "string" ? r.body.code : null;
  if (r.status !== 200 || !code) redirect(`/arene?erreur=${encodeURIComponent(String(r.body.error ?? "Impossible de lancer la partie."))}#jeu-du-jour`);
  for (let i = 0; i < JEU_DU_JOUR.BOTS; i++) await addBot(u.id, code);
  redirect(`/arene/${code}`);
}
