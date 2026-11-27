import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";
import { creerMatiere } from "./actions";
import { getGroupRanking, type Periode } from "@/lib/ranking";
import RankTable from "@/components/RankTable";

export default async function Groupe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ periode?: string }> }) {
  const { id } = await params;
  const periode: Periode = (await searchParams).periode === "30j" ? "30j" : "debut";
  const u = await requireUser();
  const role = await memberRole(id, u.id);
  if (!role) notFound();
  const [g] = await q<{ nom: string; code_invitation: string }>("select nom,code_invitation from groups where id=$1", [id]);
  const membres = await q<{ pseudo: string; role: string }>(
    "select p.pseudo,m.role from group_members m join profiles p on p.id=m.user_id where m.group_id=$1 order by m.joined_at", [id]);
  const matieres = await q<{ id: string; nom: string; jours_par_saison: number; nb_saisons: number; date_debut: string }>(
    "select id,nom,jours_par_saison,nb_saisons,to_char(date_debut,'YYYY-MM-DD') as date_debut from subjects where group_id=$1 order by created_at", [id]);

  const general = await getGroupRanking(id, periode);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <main className="mx-auto max-w-md p-4 space-y-5">
      <Link href="/" className="text-sm text-indigo-600">← Accueil</Link>
      <h1 className="text-xl font-bold">{g.nom}</h1>
      <section className="rounded bg-indigo-50 p-3 text-sm">
        Code d&apos;invitation : <b className="tracking-widest">{g.code_invitation}</b>
        <div className="text-gray-600">Lien : /rejoindre/{g.code_invitation}</div>
      </section>
      <Link href="/arene" className="block rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 p-3 text-center font-semibold text-white">⚔️ Défier le groupe dans l&apos;Arène</Link>
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Classement général</h2>
          <div className="flex gap-1 text-xs">
            <Link href="?periode=debut" className={`rounded border px-2 py-1 ${periode === "debut" ? "bg-indigo-600 text-white" : ""}`}>Depuis le début</Link>
            <Link href="?periode=30j" className={`rounded border px-2 py-1 ${periode === "30j" ? "bg-indigo-600 text-white" : ""}`}>30 derniers jours</Link>
          </div>
        </div>
        <RankTable meId={u.id} lines={general.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang, points: l.points, detail: `${l.jours} quiz` }))} />
        <p className="text-xs text-gray-500">Somme des points de toutes les matières du groupe.</p>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Matières</h2>
        {matieres.length === 0 && <p className="text-gray-500 text-sm">Aucune matière.</p>}
        {matieres.map((m) => (
          <Link key={m.id} href={`/matieres/${m.id}`} className="block rounded border p-3">
            {m.nom} <span className="text-xs text-gray-500">{m.nb_saisons} saison(s) × {m.jours_par_saison} j · début {m.date_debut}</span>
          </Link>
        ))}
      </section>
      {role === "admin" && (
        <form action={creerMatiere} className="space-y-2 rounded border p-3">
          <input type="hidden" name="group" value={id} />
          <h3 className="font-semibold">Nouvelle matière</h3>
          <input name="nom" required placeholder="Nom (ex. Biochimie S3)" className="w-full rounded border p-2" />
          <label className="block text-sm">Date de début<input type="date" name="date_debut" defaultValue={today} required className="w-full rounded border p-2" /></label>
          <div className="flex gap-2">
            <label className="flex-1 text-sm">Jours / saison<input type="number" name="jours" defaultValue={30} min={1} className="w-full rounded border p-2" /></label>
            <label className="flex-1 text-sm">Saisons<input type="number" name="saisons" defaultValue={1} min={1} className="w-full rounded border p-2" /></label>
          </div>
          <button className="w-full rounded bg-indigo-600 p-2 text-white">Créer la matière</button>
        </form>
      )}
      <section>
        <h2 className="font-semibold">Membres ({membres.length})</h2>
        <ul className="text-sm text-gray-700">{membres.map((m, i) => <li key={i}>{m.pseudo} <span className="text-xs text-gray-500">{m.role}</span></li>)}</ul>
      </section>
    </main>
  );
}
