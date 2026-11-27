import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";
import { creerMatiere, renommerGroupe, supprimerGroupe } from "./actions";
import ConfirmButton from "@/components/ConfirmButton";
import NextButton from "@/components/NextButton";
import { getGroupRanking, getGroupResults } from "@/lib/ranking";
import { ligueDe, vitrine } from "@/lib/trophees";
import { todayParis } from "@/lib/clock";
import { LigueBadge, LigueCard, Vitrine } from "@/components/Trophees";
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
  const maVitrine = vitrine(await getGroupResults(id), u.id, await todayParis());
  const mesPoints = general.find((l) => l.userId === u.id)?.points ?? 0;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="page">
      <Link href="/" className="back">← Accueil</Link>
      <header className="hero">
        <h1 className="text-3xl font-extrabold">{g.nom}</h1>
        <p className="mt-2 text-sm font-semibold text-white/90">Code d&apos;invitation <span className="ml-1 rounded-xl bg-white/25 px-2 py-0.5 text-base tracking-widest">{g.code_invitation}</span></p>
      </header>

      <div className="space-y-5 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-5 lg:col-span-2">
      <section className="space-y-3">
        <h2 className="h2">Matières</h2>
        {matieres.length === 0 && <p className="muted">Aucune matière pour l&apos;instant.</p>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          {matieres.map((m, i) => (
            <Link key={m.id} href={`/matieres/${m.id}`}
              className={`flex min-h-24 items-end rounded-3xl bg-gradient-to-br ${COULEURS[i % COULEURS.length]} p-4 text-lg leading-tight text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl lg:min-h-32 lg:text-xl`}>
              {m.nom}
            </Link>
          ))}
        </div>
      </section>

      {role === "admin" && (
        <details className="card">
          <summary className="cursor-pointer text-violet-700">＋ Nouvelle matière</summary>
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
      </div>

      <div className="space-y-5">
        <LigueCard info={ligueDe(mesPoints)} serie={maVitrine.serieActuelle} />
        <Vitrine data={maVitrine} />
        <section className="card space-y-3">
          <h2 className="h2">🏆 Classement général</h2>
          <RankTable meId={u.id} lines={general.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang, badge: <LigueBadge ligue={ligueDe(l.points).ligue} /> }))} />
        </section>
      </div>
      </div>

      {role === "admin" && (
        <details className="card">
          <summary className="text-violet-700">⚙️ Modifier ou supprimer le groupe</summary>
          <div className="mt-3 space-y-3">
            <form action={renommerGroupe} className="flex gap-2">
              <input type="hidden" name="group" value={id} />
              <input name="nom" required defaultValue={g.nom} aria-label="Nom du groupe" className="input py-2" />
              <button className="btn-ghost w-auto shrink-0 py-2">Renommer</button>
            </form>
            <form action={supprimerGroupe}>
              <input type="hidden" name="group" value={id} />
              <ConfirmButton message={`Supprimer le groupe « ${g.nom} » ? Toutes ses matières, quiz et classements seront définitivement effacés pour tous les membres.`}
                className="btn border-2 border-rose-200 bg-rose-50 py-2 text-rose-600">🗑 Supprimer le groupe</ConfirmButton>
            </form>
          </div>
        </details>
      )}

      {matieres.length > 0
        ? <NextButton href={`/matieres/${matieres[0].id}`} sub="Première matière">{matieres[0].nom}</NextButton>
        : <NextButton href="/">Retour à l&apos;accueil</NextButton>}
    </main>
  );
}
