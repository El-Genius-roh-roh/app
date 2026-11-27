import Link from "next/link";
import { requireUser } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import { q } from "@/lib/db";
import { APP_NAME } from "@/config/constants";
import AutoRefresh from "@/components/AutoRefresh";


export default async function Accueil() {
  const u = await requireUser();
  const groupes = await q<{ id: string; nom: string }>(
    `select g.id,g.nom from groups g join group_members m on m.group_id=g.id where m.user_id=$1 order by g.created_at`, [u.id]);
  return (
    <main className="page">
      <AutoRefresh every={30000} />
      <header className="flex items-center justify-between">
        <h1 className="title">{APP_NAME}</h1>
        <Link href="/profil" className="flex items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-px hover:shadow-md"><Avatar id={u.id} pseudo={u.pseudo ?? "?"} v={u.avatar_v} size={30} />{u.pseudo}</Link>
      </header>
      <h2 className="h2">Mes groupes</h2>
      {groupes.length === 0 && <p className="muted">Crée un groupe ou rejoins celui de tes amis.</p>}
      <ul className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
        {groupes.map((g) => (
          <li key={g.id}>
            <Link href={`/groupes/${g.id}`} className="card-lien flex items-center justify-between py-4 text-lg font-semibold lg:min-h-28 lg:items-end lg:text-xl">
              {g.nom}<span aria-hidden className="chevron">›</span>
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
