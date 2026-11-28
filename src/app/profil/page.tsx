import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, clearSession } from "@/lib/auth";
import { q } from "@/lib/db";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
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

export default async function Profil({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const u = await getUser();
  if (!u) redirect("/login");
  const { err } = await searchParams;
  return (
    <main className="page lg:max-w-md">
      <Link href="/" className="back"><Icon name="arrowLeft" size={16} />Accueil</Link>
      <header className="entree">
        <p className="eyebrow">Mon profil</p>
        <h1 className="title mt-1 break-words">{u.pseudo ?? "Sans pseudo"}</h1>
      </header>
      <PhotoForm aPhoto={!!u.avatar_v} avatar={<Avatar id={u.id} pseudo={u.pseudo ?? "?"} v={u.avatar_v} size={112} className="ring-4" />} />
      <form action={enregistrer} className="card space-y-3">
        <label htmlFor="pseudo" className="block text-sm font-bold">Pseudo</label>
        <input id="pseudo" name="pseudo" defaultValue={u.pseudo ?? ""} required minLength={2} maxLength={30} autoComplete="nickname"
          aria-invalid={err ? true : undefined} aria-describedby="pseudo-aide" className="input" />
        <p id="pseudo-aide" className={`text-sm ${err ? "font-semibold text-ko" : "text-texte-3"}`} role={err ? "alert" : undefined}>
          {err ? "Le pseudo doit faire au moins 2 caractères." : "Visible par les membres de tes groupes, de 2 à 30 caractères."}
        </p>
        <button className="btn-primary">Enregistrer le pseudo</button>
      </form>
      <form action={quitter}>
        <button className="btn-white text-texte-2"><Icon name="log" size={17} />Se déconnecter</button>
      </form>
    </main>
  );
}
