import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";
import { creerMatiere, renommerGroupe, supprimerGroupe } from "./actions";
import ConfirmButton from "@/components/ConfirmButton";
import { getGroupResults, getGroupTrophees } from "@/lib/ranking";
import { ligueDe, vitrine } from "@/lib/trophees";
import { sqlToday, todayGroupe } from "@/lib/clock";
import { LigueBadge, LigueCard, TropheesCompteur, Vitrine } from "@/components/Trophees";
import RankTable from "@/components/RankTable";
import Icon from "@/components/Icon";

export default async function Groupe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const role = await memberRole(id, u.id);
  if (!role) notFound();
  const [g] = await q<{ nom: string; code_invitation: string }>("select nom,code_invitation from groups where id=$1", [id]);
  // chaque matière avec son quiz du jour et mon état
  const matieres = await q<{ id: string; nom: string; jour: number | null; statut: string | null; joueurs: number }>(
    `select s.id, s.nom, gd.jour_dans_saison as jour, a.statut,
            (select count(*)::int from attempts x where x.game_day_id=gd.id and x.statut<>'en_cours') as joueurs
       from subjects s left join game_days gd on gd.subject_id=s.id and gd.date = ${sqlToday("s.id")}
       left join attempts a on a.game_day_id=gd.id and a.user_id=$2
      where s.group_id=$1 order by s.created_at`, [id, u.id]);
  const tr = await getGroupTrophees(id);
  const maVitrine = vitrine(await getGroupResults(id), u.id, await todayGroupe(id));
  const mesTrophees = tr.lignes.find((l) => l.userId === u.id)?.trophees ?? 0;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="page">
      <Link href="/" className="back"><Icon name="arrowLeft" size={16} />Accueil</Link>
      <header className="entree flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Groupe</p>
          <h1 className="title break-words">{g.nom}</h1>
        </div>
        <div className="chip px-3 py-1.5 text-sm" title="À donner à tes amis pour qu'ils rejoignent le groupe">
          <Icon name="share" size={15} />Code <span className="tracking-[0.18em] text-texte">{g.code_invitation}</span>
        </div>
      </header>

      <div className="space-y-6 lg:grid lg:grid-cols-[1.5fr_1fr] lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-6">
          <section className="space-y-3" aria-labelledby="t-mat">
            <h2 id="t-mat" className="eyebrow">Matières</h2>
            {matieres.length === 0 && <p className="card muted">Aucune matière pour l&apos;instant.{role === "admin" && " Crée la première ci-dessous."}</p>}
            <ul className="grid gap-2 sm:grid-cols-2">
              {matieres.map((m) => {
                const fait = m.statut && m.statut !== "en_cours";
                return (
                  <li key={m.id}>
                    <Link href={`/matieres/${m.id}`} className="tuile group flex h-full items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-texte-2"><Icon name="book" size={18} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{m.nom}</span>
                        <span className="num block text-xs text-texte-3">
                          {m.jour ? `Jour ${m.jour} · ${m.joueurs} ont joué` : "Pas de quiz aujourd'hui"}
                        </span>
                      </span>
                      {m.jour && (fait
                        ? <span className="chip border-ok/30 bg-ok/10 text-ok"><Icon name="check" size={13} />Fait</span>
                        : <span className="chip border-accent/40 bg-accent/10 text-accent"><Icon name="play" size={12} />À jouer</span>)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {role === "admin" && (
            <details className="card group/d">
              <summary className="flex min-h-11 items-center gap-2 font-medium text-texte">
                <Icon name="plus" size={18} className="text-accent" />Nouvelle matière
                <Icon name="chevronRight" size={16} className="ml-auto text-texte-3 transition-transform group-open/d:rotate-90" />
              </summary>
              <form action={creerMatiere} className="mt-3 space-y-3">
                <input type="hidden" name="group" value={id} />
                <label className="block space-y-1.5"><span className="text-sm font-medium text-texte-2">Nom</span>
                  <input name="nom" required placeholder="ex. Statistique inférentielle" className="input" /></label>
                <label className="block space-y-1.5"><span className="text-sm font-medium text-texte-2">Date de début</span>
                  <input type="date" name="date_debut" defaultValue={today} required className="input" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5"><span className="text-sm font-medium text-texte-2">Jours par saison</span>
                    <input type="number" name="jours" defaultValue={30} min={1} inputMode="numeric" className="input num" /></label>
                  <label className="block space-y-1.5"><span className="text-sm font-medium text-texte-2">Saisons</span>
                    <input type="number" name="saisons" defaultValue={1} min={1} inputMode="numeric" className="input num" /></label>
                </div>
                <button className="btn-primary">Créer la matière</button>
              </form>
            </details>
          )}

          <section className="space-y-3" aria-labelledby="t-cl">
            <h2 id="t-cl" className="eyebrow">Classement du groupe</h2>
            <RankTable meId={u.id} groupId={id} lines={tr.lignes.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang,
              badge: <><LigueBadge ligue={ligueDe(l.trophees).ligue} /><TropheesCompteur n={l.trophees} className="text-sm text-or" /></> }))} />
          </section>
        </div>

        <aside className="space-y-6">
          <LigueCard info={ligueDe(mesTrophees)} trophees={mesTrophees} serie={maVitrine.serieActuelle} />
          <Vitrine data={maVitrine} />
        </aside>
      </div>

      {role === "admin" && (
        <details className="card group/r">
          <summary className="flex min-h-11 items-center gap-2 font-medium text-texte-2">
            <Icon name="settings" size={18} />Gérer le groupe
            <Icon name="chevronRight" size={16} className="ml-auto text-texte-3 transition-transform group-open/r:rotate-90" />
          </summary>
          <div className="mt-3 space-y-3">
            <form action={renommerGroupe} className="flex gap-2">
              <input type="hidden" name="group" value={id} />
              <input name="nom" required defaultValue={g.nom} aria-label="Nom du groupe" className="input" />
              <button className="btn-white w-auto shrink-0">Renommer</button>
            </form>
            <form action={supprimerGroupe}>
              <input type="hidden" name="group" value={id} />
              <ConfirmButton message={`Supprimer le groupe « ${g.nom} » ? Toutes ses matières, quiz et classements seront définitivement effacés pour tous les membres.`}
                className="btn-danger"><Icon name="trash" size={17} />Supprimer le groupe</ConfirmButton>
            </form>
          </div>
        </details>
      )}
    </main>
  );
}
