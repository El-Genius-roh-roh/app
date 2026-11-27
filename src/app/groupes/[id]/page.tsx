import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";
import { creerMatiere } from "./actions";
import { getGroupRanking } from "@/lib/ranking";
import RankTable from "@/components/RankTable";

const COULEURS = ["from-sky-500 to-cyan-400", "from-orange-500 to-amber-400", "from-emerald-500 to-lime-400", "from-rose-500 to-pink-400", "from-violet-500 to-fuchsia-500"];

export default async function Groupe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const role = await memberRole(id, u.id);
  if (!role) notFound();
  const [g] = await q<{ nom: string; code_invitation: string }>("select nom,code_invitation from groups where id=$1", [id]);
  const matieres = await q<{ id: string; nom: string }>("select id,nom from subjects where group_id=$1 order by created_at", [id]);
  const general = await getGroupRanking(id);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="page">
      <Link href="/" className="back">← Accueil</Link>
      <header className="hero">
        <h1 className="text-3xl font-extrabold">{g.nom}</h1>
        <p className="mt-2 text-sm font-semibold text-white/90">Code d&apos;invitation <span className="ml-1 rounded-xl bg-white/25 px-2 py-0.5 text-base tracking-widest">{g.code_invitation}</span></p>
      </header>

      <section className="space-y-3">
        <h2 className="h2">Matières</h2>
        {matieres.length === 0 && <p className="muted">Aucune matière pour l&apos;instant.</p>}
        <div className="grid grid-cols-2 gap-3">
          {matieres.map((m, i) => (
            <Link key={m.id} href={`/matieres/${m.id}`}
              className={`flex min-h-24 items-end rounded-3xl bg-gradient-to-br ${COULEURS[i % COULEURS.length]} p-4 text-lg font-extrabold leading-tight text-white shadow-lg`}>
              {m.nom}
            </Link>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">🏆 Classement général</h2>
        <RankTable meId={u.id} lines={general.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang, points: l.points }))} />
      </section>

      {role === "admin" && (
        <details className="card">
          <summary className="cursor-pointer font-extrabold text-violet-700">＋ Nouvelle matière</summary>
          <form action={creerMatiere} className="mt-3 space-y-3">
            <input type="hidden" name="group" value={id} />
            <input name="nom" required placeholder="Nom (ex. Biochimie S3)" className="input" />
            <label className="block text-sm font-semibold">Date de début<input type="date" name="date_debut" defaultValue={today} required className="input mt-1" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold">Jours / saison<input type="number" name="jours" defaultValue={30} min={1} className="input mt-1" /></label>
              <label className="text-sm font-semibold">Saisons<input type="number" name="saisons" defaultValue={1} min={1} className="input mt-1" /></label>
            </div>
            <button className="btn-primary">Créer la matière</button>
          </form>
        </details>
      )}
    </main>
  );
}
