import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, clearSession } from "@/lib/auth";
import { q } from "@/lib/db";
import Avatar from "@/components/Avatar";
import PhotoForm from "./PhotoForm";

async function enregistrer(fd: FormData) {
  "use server";
  const u = await getUser();
  if (!u) redirect("/login");
  const pseudo = String(fd.get("pseudo") ?? "").trim().slice(0, 30);
  if (pseudo.length < 2) redirect("/profil?err=1");
  await q("update profiles set pseudo=$1 where id=$2", [pseudo, u.id]);
  redirect("/");
}
async function quitter() { "use server"; await clearSession(); redirect("/login"); }

export default async function Profil() {
  const u = await getUser();
  if (!u) redirect("/login");
  return (
    <main className="page max-w-sm">
      <Link href="/" className="back">← Accueil</Link>
      <h1 className="title">Mon profil</h1>
      <PhotoForm aPhoto={!!u.avatar_v} avatar={<Avatar id={u.id} pseudo={u.pseudo ?? "?"} v={u.avatar_v} size={112} className="ring-4" />} />
      <form action={enregistrer} className="card space-y-3">
        <input name="pseudo" defaultValue={u.pseudo ?? ""} required minLength={2} placeholder="Pseudo" className="input" />
        <button className="btn-primary">Enregistrer</button>
      </form>
      <form action={quitter}><button className="muted underline">Se déconnecter</button></form>
    </main>
  );
}
