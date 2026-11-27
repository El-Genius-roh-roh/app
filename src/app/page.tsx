import Link from "next/link";
import { requireUser } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import { q } from "@/lib/db";
import { APP_NAME } from "@/config/constants";

const COULEURS = ["from-violet-500 to-fuchsia-500", "from-orange-500 to-amber-400", "from-sky-500 to-cyan-400", "from-emerald-500 to-lime-400", "from-rose-500 to-pink-400"];

export default async function Accueil() {
  const u = await requireUser();
  const groupes = await q<{ id: string; nom: string }>(
    `select g.id,g.nom from groups g join group_members m on m.group_id=g.id where m.user_id=$1 order by g.created_at`, [u.id]);
  return (
    <main className="page">
      <header className="flex items-center justify-between">
        <h1 className="title bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-transparent">{APP_NAME}</h1>
        <Link href="/profil" className="flex items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-sm text-violet-700 shadow-sm"><Avatar id={u.id} pseudo={u.pseudo ?? "?"} v={u.avatar_v} size={30} />{u.pseudo}</Link>
      </header>
      <h2 className="h2">Mes groupes</h2>
      {groupes.length === 0 && <p className="muted">Crée un groupe ou rejoins celui de tes amis.</p>}
      <ul className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
        {groupes.map((g, i) => (
          <li key={g.id}>
            <Link href={`/groupes/${g.id}`} className={`flex items-center justify-between rounded-3xl bg-gradient-to-r ${COULEURS[i % COULEURS.length]} p-5 text-lg text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl lg:min-h-32 lg:items-end lg:text-2xl`}>
              {g.nom}<span aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3 lg:flex lg:max-w-md">
        <Link href="/groupes/nouveau" className="btn-primary">＋ Créer</Link>
        <Link href="/rejoindre" className="btn-ghost">Rejoindre</Link>
      </div>
    </main>
  );
}
