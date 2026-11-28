import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";
import { creerMatiere, renommerGroupe, supprimerGroupe } from "./actions";
import ConfirmButton from "@/components/ConfirmButton";
import { getGroupRanking, getGroupResults, getGroupTrophees } from "@/lib/ranking";
import { formatDuJour, resultatTexte } from "@/lib/quiz/formats";
import { ligueDe, vitrine } from "@/lib/trophees";
import { todayParis } from "@/lib/clock";
import { GainTrophees, GemmesCompteur, LigueBadge, LigueCard, TropheesCompteur, Vitrine } from "@/components/Trophees";
import RankTable from "@/components/RankTable";
import { quizDisponibles } from "@/app/matieres/[id]/QuizCard";
import AutoRefresh from "@/components/AutoRefresh";
import { CONFIG, TROPHEES } from "@/config/constants";
import Icon from "@/components/Icon";
import CopyButton from "@/components/CopyButton";
import Details from "@/components/Details";

type Onglet = "defi" | "competitif";

export default async function Groupe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ onglet?: string }> }) {
  const { id } = await params;
  const onglet: Onglet = (await searchParams).onglet === "competitif" ? "competitif" : "defi";
  const u = await requireUser();
  const role = await memberRole(id, u.id);
  if (!role) notFound();
  const [g] = await q<{ nom: string; code_invitation: string }>("select nom,code_invitation from groups where id=$1", [id]);
  const matieres = await q<{ id: string; nom: string }>("select id,nom from subjects where group_id=$1 order by created_at", [id]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="page">
      <AutoRefresh every={15000} />
      <Link href="/" className="back"><Icon name="arrowLeft" size={16} />Accueil</Link>
      <header className="entree flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Groupe</p>
          <h1 className="title break-words">{g.nom}</h1>
        </div>
        <div className="chip px-3 py-1.5 text-sm" title="À donner à tes amis pour qu'ils rejoignent le groupe">
          <Icon name="share" size={15} />Code <span className="code tracking-[0.18em] text-texte">{g.code_invitation}</span>
          <CopyButton text={g.code_invitation} label="Copier le code d'invitation" />
        </div>
      </header>

      {/* deux onglets : le défi quotidien (gemmes) et le compétitif (trophées de fin de saison, ligues, badges) */}
      <nav className="grid max-w-md grid-cols-2 gap-1 rounded-[14px] bg-surface-2 p-1" aria-label="Onglets du groupe">
        {([["defi", "Jeux du jour", "target"], ["competitif", "Compétitif", "trophy"]] as const).map(([k, titre, ic]) => (
          <Link key={k} href={`?onglet=${k}`} scroll={false} aria-current={onglet === k ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-[11px] text-sm font-bold transition-colors ${onglet === k ? "bg-surface text-accent-fort shadow-[0_2px_0_var(--color-ligne)]" : "text-texte-2 hover:text-texte"}`}>
            <Icon name={ic} size={16} />{titre}
          </Link>
        ))}
      </nav>

      {onglet === "defi" ? <Defi groupId={id} userId={u.id} matieres={matieres} /> : <Competitif groupId={id} userId={u.id} />}

      {onglet === "defi" && (
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

      {onglet === "defi" && role === "admin" && (
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

/* ------------------------------------------------------------------ onglet « Défi du jour » : quiz du jour, rattrapages, gemmes */

async function Defi({ groupId, userId, matieres }: { groupId: string; userId: string; matieres: { id: string; nom: string }[] }) {
  const etats = await Promise.all(matieres.map(async (m) => ({ m, ...(await quizDisponibles(m.id, userId, await todayParis(m.id))) })));
  const general = await getGroupRanking(groupId);
  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-8 lg:space-y-0">
      <section className="space-y-3" aria-labelledby="t-mat">
        <h2 id="t-mat" className="eyebrow">Matières</h2>
        {matieres.length === 0 && <p className="card muted">Aucune matière pour l&apos;instant.</p>}
        <ul className="grid gap-2">
          {etats.map(({ m, jour, rattrapages }) => {
            const fait = jour?.statut && jour.statut !== "en_cours";
            return (
              <li key={m.id}>
                <Link href={`/matieres/${m.id}`} className="tuile group flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-texte-2"><Icon name="book" size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{m.nom}</span>
                    <span className="block text-xs text-texte-3">
                      {!jour ? "Pas de jeu aujourd'hui" : fait ? <>Fait · <span className="num">{resultatTexte(formatDuJour(jour.date), jour.erreurs ?? 0, CONFIG.QUESTIONS_PAR_JOUR)}</span></> : <>Jour <span className="num">{jour.jour}</span></>}
                      {rattrapages.length > 0 && <span className="font-semibold text-energie"> · {rattrapages.length} à rattraper</span>}
                    </span>
                  </span>
                  {jour && (fait
                    ? <span className="chip border-ok/30 bg-ok-doux text-ok"><Icon name="check" size={13} />Fait</span>
                    : <span className="chip border-accent/30 bg-accent-doux text-accent-fort"><Icon name="play" size={12} />À jouer</span>)}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="t-gen">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="t-gen" className="eyebrow">Classement général</h2>
          <Details>Gemmes cumulées sur toutes les matières.</Details>
        </div>
        <RankTable podium meId={userId} groupId={groupId} lines={general.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang,
          detail: `${l.jours} jeu${l.jours > 1 ? "x" : ""} du jour joué${l.jours > 1 ? "s" : ""}`, badge: <GemmesCompteur n={l.points} className="text-base text-accent-fort" /> }))} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ onglet « Compétitif » : trophées de fin de saison, ligues, badges (D30, D47) */

async function Competitif({ groupId, userId }: { groupId: string; userId: string }) {
  const tr = await getGroupTrophees(groupId);
  const maVitrine = vitrine(await getGroupResults(groupId), userId, tr.today);
  const moi = tr.lignes.find((l) => l.userId === userId);
  const enCours = tr.saisons.filter((s) => !s.terminee);
  const finies = tr.saisons.filter((s) => s.terminee).reverse();
  const enJeu = enCours.reduce((n, s) => n + (s.classement.find((l) => l.userId === userId)?.trophees ?? 0), 0);
  const jj = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;
  return (
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-6">
        <LigueCard trophees={moi?.total ?? 0} enJeu={enJeu} serie={maVitrine.serieActuelle} />

        <section className="space-y-3" aria-labelledby="t-tr">
          <h2 id="t-tr" className="eyebrow">Classement des trophées du groupe</h2>
          <RankTable podium meId={userId} groupId={groupId} lines={tr.lignes.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang,
            badge: <><LigueBadge ligue={ligueDe(l.total).ligue} /><TropheesCompteur n={l.trophees} className="text-sm text-or" /></> }))} />
          <Details>
            Trophées gagnés à la fin des saisons des matières du groupe : <span className="num">{TROPHEES.PAR_JOUR_PAR_JOUEUR_DERRIERE}</span> × jours de la saison × joueurs classés derrière soi aux gemmes.
            La ligue affichée est celle de chaque joueur, unique : elle compte ses trophées de tous ses groupes.
          </Details>
        </section>

        {enCours.length > 0 && (
          <section className="space-y-3" aria-labelledby="t-encours">
            <h2 id="t-encours" className="eyebrow">Saisons en cours · trophées en jeu</h2>
            {enCours.map((s) => (
              <div key={`${s.subjectId}-${s.saison}`} className="space-y-2">
                <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <Link href={`/matieres/${s.subjectId}`} className="font-bold hover:text-accent-fort">{s.matiere}{s.saison > 1 ? ` · saison ${s.saison}` : ""}</Link>
                  <span className="num text-xs text-texte-3">fin le {jj(s.fin)} · {s.nbJours} jours</span>
                </p>
                <RankTable meId={userId} groupId={groupId} empty="Personne n'a encore joué cette saison."
                  lines={s.classement.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang,
                    badge: <><GemmesCompteur n={l.points} className="text-sm text-accent-fort" />{l.trophees > 0 && <GainTrophees n={l.trophees} provisoire />}</> }))} />
              </div>
            ))}
          </section>
        )}
      </div>
      <div className="space-y-6">
        <Vitrine data={maVitrine} />
        {finies.length > 0 && (
          <section className="card space-y-2" aria-labelledby="t-hist">
            <h2 id="t-hist" className="h2">Saisons terminées</h2>
            <ul className="divide-y divide-ligne">
              {finies.map((s) => {
                const j = s.classement.find((x) => x.userId === userId);
                const premiers = s.classement.filter((x) => x.rang === 1).map((x) => x.pseudo).join(", ");
                return (
                  <li key={`${s.subjectId}-${s.saison}`} className="flex min-h-12 items-center gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{s.matiere}{s.saison > 1 ? ` · saison ${s.saison}` : ""}</span>
                      <span className="block truncate text-xs text-texte-3">{premiers ? <>1er : {premiers}</> : "Personne n'a joué"}{j ? ` · tu as fini ${j.rang === 1 ? "1er" : `${j.rang}e`}` : ""}</span>
                    </span>
                    {j && j.trophees > 0 ? <GainTrophees n={j.trophees} /> : <span className="text-xs text-texte-3">+0</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
