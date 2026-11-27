import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { APP_NAME } from "@/config/constants";

export default async function Accueil() {
  const u = await requireUser();
  const groupes = await q<{ id: string; nom: string; role: string }>(
    `select g.id,g.nom,m.role from groups g join group_members m on m.group_id=g.id where m.user_id=$1 order by g.created_at`, [u.id]);
  return (
    <main className="mx-auto max-w-md p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{APP_NAME}</h1>
        <Link href="/profil" className="text-sm text-indigo-600">{u.pseudo}</Link>
      </header>
      <h2 className="font-semibold">Mes groupes</h2>
      {groupes.length === 0 && <p className="text-gray-500">Aucun groupe pour l&apos;instant.</p>}
      <ul className="space-y-2">
        {groupes.map((g) => (
          <li key={g.id}><Link href={`/groupes/${g.id}`} className="block rounded border p-3">{g.nom} <span className="text-xs text-gray-500">({g.role})</span></Link></li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Link href="/groupes/nouveau" className="flex-1 rounded bg-indigo-600 p-2 text-center text-white">Créer un groupe</Link>
        <Link href="/rejoindre" className="flex-1 rounded border p-2 text-center">Rejoindre</Link>
      </div>
    </main>
  );
}
