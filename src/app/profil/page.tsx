import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, clearSession } from "@/lib/auth";
import { q } from "@/lib/db";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import Details from "@/components/Details";
import PhotoForm from "./PhotoForm";
import { basculerPremium } from "./actions";

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
        {err ? (
          <p id="pseudo-aide" className="text-sm font-semibold text-ko" role="alert">Le pseudo doit faire au moins 2 caractères.</p>
        ) : (
          <Details>Visible par les membres de tes groupes, de 2 à 30 caractères.</Details>
        )}
        <button className="btn-primary">Enregistrer le pseudo</button>
      </form>
      <section id="premium" className={`card scroll-mt-24 space-y-3 ${u.premium ? "border-or/50" : ""}`} aria-labelledby="t-premium">
        <div className="flex items-center gap-3">
          <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${u.premium ? "bg-or-vif text-sur-or" : "bg-surface-2 text-texte-3"}`}><Icon name="sparkles" size={20} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="t-premium" className="font-bold">{u.premium ? "Compte premium" : "Compte gratuit"}</h2>
            <p className="text-sm text-texte-3">{u.premium ? "Flashcards et Arène débloquées." : "Défi du jour, Memory et Relier. Les flashcards et l'Arène sont premium."}</p>
          </div>
        </div>
        {process.env.DEMO_MODE === "1" ? (
          <form action={basculerPremium}>
            <input type="hidden" name="premium" value={u.premium ? "0" : "1"} />
            <button className={u.premium ? "btn-white" : "btn-primary"}><Icon name="sparkles" size={17} />{u.premium ? "Repasser en gratuit (démo)" : "Activer le premium (démo, sans paiement)"}</button>
          </form>
        ) : !u.premium && <p className="text-sm text-texte-3">Le paiement n&apos;est pas encore ouvert.</p>}
      </section>
      <form action={quitter}>
        <button className="btn-white text-texte-2"><Icon name="log" size={17} />Se déconnecter</button>
      </form>
    </main>
  );
}
