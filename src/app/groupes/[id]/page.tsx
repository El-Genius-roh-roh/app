import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Settings } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";
import { creerMatiere, renommerGroupe, supprimerGroupe } from "./actions";
import ConfirmButton from "@/components/ConfirmButton";
import CopyButton from "@/components/CopyButton";
import NextButton from "@/components/NextButton";
import { getGroupRanking, getGroupResults, getGroupTrophees } from "@/lib/ranking";
import { ligueDe, vitrine } from "@/lib/trophees";
import { todayGroupe, todayParis } from "@/lib/clock";
import { GainTrophees, GemmesCompteur, LigueBadge, LigueCard, TropheesCompteur, Vitrine } from "@/components/Trophees";
import RankTable, { RankBadge } from "@/components/RankTable";
import { quizDisponibles } from "@/app/matieres/[id]/QuizCard";
import AutoRefresh from "@/components/AutoRefresh";
import { CONFIG } from "@/config/constants";

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
      <Link href="/" className="back">Accueil</Link>
      <header className="hero">
        <h1 className="title">{g.nom}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/90">
          <span>Code d&apos;invitation</span>
          <span className="rounded-lg bg-white/20 px-2.5 py-0.5 font-mono text-base font-semibold tracking-widest">{g.code_invitation}</span>
          <CopyButton text={g.code_invitation} toastMessage={`Code ${g.code_invitation} copié !`}
            className="bg-white/20 text-white hover:bg-white/30" />
        </div>
      </header>

      <nav className="segmented max-w-md" aria-label="Onglets du groupe">
        <Link href="?onglet=defi" scroll={false} aria-current={onglet === "defi" ? "page" : undefined}>Défi du jour</Link>
        <Link href="?onglet=competitif" scroll={false} aria-current={onglet === "competitif" ? "page" : undefined}>Compétitif</Link>
      </nav>

      {onglet === "defi" ? <Defi groupId={id} userId={u.id} matieres={matieres} /> : <Competitif groupId={id} userId={u.id} />}

      {onglet === "defi" && role === "admin" && (
        <details className="card">
          <summary className="text-accent-600">Nouvelle matière</summary>
          <form action={creerMatiere} className="mt-3 space-y-3">
            <input type="hidden" name="group" value={id} />
            <input name="nom" required placeholder="Nom (ex. Biochimie S3)" className="input" />
            <label className="block text-sm font-medium">Date de début<input type="date" name="date_debut" defaultValue={today} required className="input mt-1" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">Jours / saison<input type="number" name="jours" defaultValue={30} min={1} className="input mt-1" /></label>
              <label className="text-sm font-medium">Saisons<input type="number" name="saisons" defaultValue={1} min={1} className="input mt-1" /></label>
            </div>
            <button className="btn-primary">Créer la matière</button>
          </form>
        </details>
      )}

      {onglet === "defi" && role === "admin" && (
        <details className="card">
          <summary className="inline-flex items-center gap-2 font-semibold text-accent-600"><Settings className="h-4 w-4" /> Paramètres du groupe</summary>
          <div className="mt-3 space-y-3">
            <form action={renommerGroupe} className="flex gap-2">
              <input type="hidden" name="group" value={id} />
              <input name="nom" required defaultValue={g.nom} aria-label="Nom du groupe" className="input py-2" />
              <button className="btn-ghost w-auto shrink-0 py-2">Renommer</button>
            </form>
            <form action={supprimerGroupe}>
              <input type="hidden" name="group" value={id} />
              <ConfirmButton message={`Supprimer le groupe « ${g.nom} » ? Toutes ses matières, quiz et classements seront définitivement effacés pour tous les membres.`}
                className="btn bg-rose-50 hover:bg-rose-100 py-2 text-rose-600">Supprimer le groupe</ConfirmButton>
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

/* ------------------------------------------------------------------ onglet « Défi du jour » */

async function Defi({ groupId, userId, matieres }: { groupId: string; userId: string; matieres: { id: string; nom: string }[] }) {
  const etats = await Promise.all(matieres.map(async (m) => ({ m, ...(await quizDisponibles(m.id, userId, await todayParis(m.id))) })));
  const general = await getGroupRanking(groupId);
  return (
    <div className="space-y-5 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6 lg:space-y-0">
      <section className="space-y-3 lg:col-span-2">
        <h2 className="h2">Matières</h2>
        {matieres.length === 0 && <p className="muted">Aucune matière pour l&apos;instant.</p>}
        <ul className="space-y-2">
          {etats.map(({ m, jour, rattrapages }) => {
            const fait = jour?.statut && jour.statut !== "en_cours";
            return (
              <li key={m.id}>
                <Link href={`/matieres/${m.id}`} className="card-lien flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${!jour ? "bg-slate-300" : fait ? "bg-emerald-500" : "bg-accent-500"}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[1.05rem] font-semibold">{m.nom}</span>
                    <span className="block text-sm text-slate-500">
                      {!jour ? "Pas de quiz aujourd'hui" : fait ? `Fait · ${CONFIG.QUESTIONS_PAR_JOUR - (jour.erreurs ?? 0)}/${CONFIG.QUESTIONS_PAR_JOUR}` : `Quiz du jour ${jour.jour} à jouer`}
                      {rattrapages.length > 0 && ` · ${rattrapages.length} à rattraper`}
                    </span>
                  </span>
                  <ChevronRight className="chevron h-5 w-5" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card space-y-3 lg:col-span-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">Classement général</h2>
          <span className="muted">gemmes, toutes matières</span>
        </div>
        <RankTable podium meId={userId} groupId={groupId} lines={general.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang,
          detail: `${l.jours} quiz joué${l.jours > 1 ? "s" : ""}`, badge: <GemmesCompteur n={l.points} className="text-base text-slate-800" /> }))} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ onglet « Compétitif » */

async function Competitif({ groupId, userId }: { groupId: string; userId: string }) {
  const tr = await getGroupTrophees(groupId);
  const maVitrine = vitrine(await getGroupResults(groupId), userId, await todayGroupe(groupId));
  const mesTrophees = tr.lignes.find((l) => l.userId === userId)?.trophees ?? 0;
  const enCours = tr.saisons.filter((s) => !s.terminee);
  const finies = tr.saisons.filter((s) => s.terminee).reverse();
  return (
    <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-5">
        <LigueCard info={ligueDe(mesTrophees)} trophees={mesTrophees} serie={maVitrine.serieActuelle} />
        <section className="card space-y-3">
          <h2 className="h2">Classement des trophées</h2>
          <RankTable podium meId={userId} groupId={groupId} lines={tr.lignes.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang,
            badge: <><LigueBadge ligue={ligueDe(l.trophees).ligue} /><TropheesCompteur n={l.trophees} className="ml-1 text-sm text-slate-700" /></> }))} />
          <p className="muted">Les trophées se gagnent à la fin de chaque saison : jours de la saison × joueurs classés derrière soi aux gemmes.</p>
        </section>
      </div>
      <div className="space-y-5">
        <Vitrine data={maVitrine} />
        {enCours.length > 0 && (
          <section className="card space-y-3">
            <h2 className="h2">Saisons en cours</h2>
            {enCours.map((s) => {
              const moi = s.classement.find((l) => l.userId === userId);
              return (
                <Link key={`${s.subjectId}-${s.saison}`} href={`/matieres/${s.subjectId}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-slate-100">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{s.matiere}{s.saison > 1 ? ` · saison ${s.saison}` : ""}</span>
                    <span className="block text-sm text-slate-500">Fin le {s.fin.slice(8)}/{s.fin.slice(5, 7)} · {moi ? `${moi.rang}${moi.rang === 1 ? "er" : "e"} sur ${s.classement.length}` : "pas encore joué"}</span>
                  </span>
                  {moi && <GainTrophees n={moi.trophees} provisoire />}
                </Link>
              );
            })}
            <p className="muted">En gris : trophées que tu gagnerais si la saison s&apos;arrêtait aujourd&apos;hui.</p>
          </section>
        )}
        {finies.length > 0 && (
          <section className="card space-y-2">
            <h2 className="h2">Saisons terminées</h2>
            {finies.map((s) => (
              <div key={`${s.subjectId}-${s.saison}`} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-500">{s.matiere} · saison {s.saison}</p>
                {s.classement.length === 0 ? <p className="muted">Personne n&apos;a joué.</p> : s.classement.slice(0, 3).map((l) => (
                  <p key={l.userId} className="flex items-center gap-2"><RankBadge rang={l.rang} /> {l.pseudo} <GainTrophees n={l.trophees} /></p>
                ))}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
