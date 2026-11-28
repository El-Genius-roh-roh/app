import Link from "next/link";
import { etatGenerationIA, llmConfigured, preparerEnArrierePlan } from "@/lib/quiz/ai";
import IaPanel from "./IaPanel";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { importer, supprimer, monter, genererQuiz, jourSuivant, renommerMatiere, supprimerMatiere } from "./actions";
import ConfirmButton from "@/components/ConfirmButton";
import NextButton from "@/components/NextButton";
import { todayParis } from "@/lib/clock";
import AutoRefresh from "@/components/AutoRefresh";
import QuizCard from "./QuizCard";
import Classements from "./Classements";
import { url } from "@/lib/url";
import Icon from "@/components/Icon";

type Doc = { id: string; nom: string; categorie: "cours" | "annale"; ordre: number; statut: "traitement" | "pret" | "erreur"; erreur: string | null };

function Statut({ s, erreur }: { s: Doc["statut"]; erreur: string | null }) {
  if (s === "traitement") return <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent" role="img" aria-label="En traitement" />;
  if (s === "erreur") return <span title={erreur ?? undefined}><Icon name="x" size={17} className="text-ko" label="Erreur" /></span>;
  return <Icon name="check" size={17} className="text-ok" label="Prêt" />;
}

export default async function Matiere({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saison?: string }> }) {
  const { id } = await params;
  const { saison: saisonParam } = await searchParams;
  const u = await requireUser();
  const ctx = await getSubjectFor(id, u.id);
  if (!ctx) notFound();
  const { subject: s, canManage } = ctx;

  const docs = await q<Doc>("select id,nom,categorie,ordre,statut,erreur from documents where subject_id=$1 order by categorie,ordre,created_at", [id]);
  const today = await todayParis(id);
  const enCours = docs.some((d) => d.statut === "traitement");
  if (!enCours) preparerEnArrierePlan(id); // l'IA prépare les prochains quiz sans bloquer la page
  const etatIA = canManage ? etatGenerationIA(id) : null;
  const soeurs = await q<{ id: string; nom: string }>("select id,nom from subjects where group_id=$1 order by created_at", [s.group_id]);
  const suivante = soeurs.length > 1 ? soeurs[(soeurs.findIndex((m) => m.id === id) + 1) % soeurs.length] : null;

  const DocBox = ({ categorie, titre }: { categorie: "cours" | "annale"; titre: string }) => {
    const list = docs.filter((d) => d.categorie === categorie);
    return (
      <section className="card space-y-3">
        <h2 className="h2 flex items-center gap-2"><Icon name={categorie === "cours" ? "book" : "file"} className="text-texte-3" />{titre}</h2>
        {list.length === 0 && <p className="muted">Aucun PDF.</p>}
        {list.length > 0 && (
          <ul className="divide-y divide-ligne">
            {list.map((d) => (
              <li key={d.id} className="flex min-h-12 items-center gap-2.5 text-sm">
                <Statut s={d.statut} erreur={d.erreur} />
                <a href={url(`/api/documents/${d.id}/file`)} target="_blank" className="min-w-0 flex-1 truncate hover:text-accent">{d.nom}</a>
                {canManage && categorie === "cours" && d.ordre > 1 && (
                  <form action={monter}><input type="hidden" name="subject" value={id} /><input type="hidden" name="doc" value={d.id} />
                    <button title="Monter dans l'ordre du programme" aria-label={`Monter ${d.nom}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-texte-3 hover:bg-surface-2 hover:text-texte"><Icon name="arrowUp" size={17} /></button></form>
                )}
                {canManage && (
                  <form action={supprimer}><input type="hidden" name="subject" value={id} /><input type="hidden" name="doc" value={d.id} />
                    <button title="Supprimer" aria-label={`Supprimer ${d.nom}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-texte-3 hover:bg-ko/10 hover:text-ko"><Icon name="trash" size={17} /></button></form>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage && (
          <form action={importer} className="space-y-2">
            <input type="hidden" name="subject" value={id} />
            <input type="hidden" name="categorie" value={categorie} />
            <label className="block cursor-pointer rounded-xl border border-dashed border-ligne p-3 text-sm text-texte-2 transition-colors hover:border-accent/60">
              <span className="sr-only">PDF à importer ({titre})</span>
              <input type="file" name="fichier" accept="application/pdf" multiple required
                className="w-full text-sm file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:font-semibold file:text-texte" />
            </label>
            <button className="btn-white"><Icon name="upload" size={17} />Importer</button>
          </form>
        )}
      </section>
    );
  };

  return (
    <main className="page">
      <AutoRefresh every={enCours || etatIA?.enCours ? 3000 : 15000} />
      <Link href={`/groupes/${s.group_id}`} className="back"><Icon name="arrowLeft" size={16} />Groupe</Link>
      <header className="entree space-y-5">
        <h1 className="title break-words">{s.nom}</h1>
        <div className="hero"><QuizCard subjectId={id} userId={u.id} today={today} /></div>
      </header>

      <div className="space-y-6 lg:grid lg:grid-cols-[1.5fr_1fr] lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-6">
          <Classements subjectId={id} nom={s.nom} groupId={s.group_id} userId={u.id} today={today} saisonParam={saisonParam} />
        </div>
        <aside className="space-y-6">
          <div className="space-y-2.5">
          <Link href={`/matieres/${id}/notions`} className="tuile group flex items-center gap-3.5">
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ok-doux text-ok shadow-[0_3px_0_var(--color-ligne)]">
              <Icon name="book" size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">Glossaire du cours</span>
              <span className="block text-sm text-texte-3">Les notions et leurs définitions</span>
            </span>
            <Icon name="chevronRight" className="text-texte-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href={`/matieres/${id}/flashcards`} className="tuile group flex items-center gap-3.5">
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-doux text-accent-fort shadow-[0_3px_0_var(--color-ligne)]">
              <Icon name="cards" size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">Flashcards</span>
              <span className="block text-sm text-texte-3">Question au recto, réponse au verso</span>
            </span>
            <Icon name="chevronRight" className="text-texte-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href={`/matieres/${id}/memory`} className="tuile group flex items-center gap-3.5">
            <span aria-hidden className="grid h-11 w-11 shrink-0 grid-cols-2 gap-1 rounded-xl bg-accent p-2 shadow-[0_3px_0_var(--color-accent-ombre)]">
              <span className="rounded-[3px] bg-sur-accent/85" /><span className="rounded-full bg-or-vif" />
              <span className="rounded-full bg-sur-accent/45" /><span className="rounded-[3px] bg-sur-accent/85" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">Memory</span>
              <span className="block text-sm text-texte-3">Associe chaque question à sa réponse</span>
            </span>
            <Icon name="chevronRight" className="text-texte-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
          </div>
          {canManage && llmConfigured() && <IaPanel subjectId={id} etat={etatIA} secondes={etatIA?.enCours ? Math.round((Date.now() - etatIA.debut) / 1000) : 0} />}
          {canManage && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Link href={`/matieres/${id}/chat`} className="btn-white"><Icon name="message" size={17} />Générer avec un chat</Link>
              <Link href={`/matieres/${id}/questions`} className="btn-white"><Icon name="pencil" size={17} />Écrire / modifier les questions</Link>
            </div>
          )}
          <DocBox categorie="cours" titre="Cours" />
          <DocBox categorie="annale" titre="Annales" />
        </aside>
      </div>

      {canManage && process.env.DEMO_MODE === "1" && (
        <details className="group/d rounded-2xl border border-dashed border-or/40 p-3 text-sm">
          <summary className="flex min-h-11 items-center gap-2 font-medium text-or">
            <Icon name="calendar" size={17} />Outils de démo · <span className="num">{today}</span>
            <Icon name="chevronRight" size={16} className="ml-auto transition-transform group-open/d:rotate-90" />
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <form action={genererQuiz}><input type="hidden" name="subject" value={id} /><button className="btn-white">Générer (simulé)</button></form>
            <form action={jourSuivant}><input type="hidden" name="subject" value={id} /><button className="btn-white">Jour suivant</button></form>
          </div>
        </details>
      )}
      {canManage && (
        <details className="card group/r">
          <summary className="flex min-h-11 items-center gap-2 font-medium text-texte-2">
            <Icon name="settings" size={18} />Gérer la matière
            <Icon name="chevronRight" size={16} className="ml-auto text-texte-3 transition-transform group-open/r:rotate-90" />
          </summary>
          <div className="mt-3 space-y-3">
            <form action={renommerMatiere} className="flex gap-2">
              <input type="hidden" name="subject" value={id} />
              <input name="nom" required defaultValue={s.nom} aria-label="Nom de la matière" className="input" />
              <button className="btn-white w-auto shrink-0">Renommer</button>
            </form>
            <form action={supprimerMatiere}>
              <input type="hidden" name="subject" value={id} />
              <ConfirmButton message={`Supprimer « ${s.nom} » ? Les cours, quiz et résultats de cette matière seront définitivement effacés.`}
                className="btn-danger"><Icon name="trash" size={17} />Supprimer la matière</ConfirmButton>
            </form>
          </div>
        </details>
      )}

      {suivante
        ? <NextButton href={`/matieres/${suivante.id}`} sub="Matière suivante">{suivante.nom}</NextButton>
        : <NextButton href={`/groupes/${s.group_id}`}>Retour au groupe</NextButton>}
    </main>
  );
}
