import Link from "next/link";
import { llmConfigured, preparerEnArrierePlan } from "@/lib/quiz/ai";
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

type Doc = { id: string; nom: string; categorie: "cours" | "annale"; ordre: number; statut: "traitement" | "pret" | "erreur"; erreur: string | null };
const STATUT = { traitement: "⏳", pret: "✅", erreur: "❌" } as const;

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
  const soeurs = await q<{ id: string; nom: string }>("select id,nom from subjects where group_id=$1 order by created_at", [s.group_id]);
  const suivante = soeurs.length > 1 ? soeurs[(soeurs.findIndex((m) => m.id === id) + 1) % soeurs.length] : null;

  const DocBox = ({ categorie, titre, icone, couleur }: { categorie: "cours" | "annale"; titre: string; icone: string; couleur: string }) => {
    const list = docs.filter((d) => d.categorie === categorie);
    return (
      <section className="card space-y-3">
        <h2 className={`h2 ${couleur}`}>{icone} {titre}</h2>
        {list.length === 0 && <p className="muted">Aucun PDF.</p>}
        <ul className="space-y-2">
          {list.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-2xl bg-white/45 backdrop-blur-md px-3 py-2 text-sm">
              <span title={d.erreur ?? undefined}>{STATUT[d.statut]}</span>
              <a href={url(`/api/documents/${d.id}/file`)} target="_blank" className="flex-1 truncate">{d.nom}</a>
              {canManage && categorie === "cours" && d.ordre > 1 && (
                <form action={monter}><input type="hidden" name="subject" value={id} /><input type="hidden" name="doc" value={d.id} /><button title="Monter" className=" text-violet-600">↑</button></form>
              )}
              {canManage && (
                <form action={supprimer}><input type="hidden" name="subject" value={id} /><input type="hidden" name="doc" value={d.id} /><button title="Supprimer" className=" text-rose-500">✕</button></form>
              )}
            </li>
          ))}
        </ul>
        {canManage && (
          <form action={importer} className="space-y-2">
            <input type="hidden" name="subject" value={id} />
            <input type="hidden" name="categorie" value={categorie} />
            <input type="file" name="fichier" accept="application/pdf" multiple required
              className="w-full rounded-2xl border-2 border-dashed border-violet-200 p-3 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-violet-100 file:px-3 file:py-1.5 file:font-bold file:text-violet-700" />
            <button className="btn-ghost py-2">Importer</button>
          </form>
        )}
      </section>
    );
  };

  return (
    <main className="page">
      {enCours && <AutoRefresh />}
      <Link href={`/groupes/${s.group_id}`} className="back">← Groupe</Link>
      <header className="hero space-y-4">
        <h1 className="text-3xl font-extrabold lg:text-4xl">{s.nom}</h1>
        <QuizCard subjectId={id} userId={u.id} today={today} />
      </header>

      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-5">
          <Classements subjectId={id} groupId={s.group_id} userId={u.id} today={today} saisonParam={saisonParam} />
        </div>
        <div className="space-y-5">
          {canManage && llmConfigured() && <IaPanel subjectId={id} />}
          {canManage && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/matieres/${id}/chat`} className="btn-orange">💬 Générer avec le chat</Link>
              <Link href={`/matieres/${id}/questions`} className="btn-white">✍️ Créer / modifier les questions</Link>
            </div>
          )}
          <DocBox categorie="cours" titre="Cours" icone="📘" couleur="text-sky-600" />
          <DocBox categorie="annale" titre="Annales" icone="📝" couleur="text-orange-600" />
        </div>
      </div>

      {canManage && process.env.DEMO_MODE === "1" && (
        <details className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/80 p-3 text-sm">
          <summary className="cursor-pointer text-amber-700">Outils de démo · {today}</summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <form action={genererQuiz}><input type="hidden" name="subject" value={id} /><button className="btn-white py-2 text-sm">Générer (simulé)</button></form>
            <form action={jourSuivant}><input type="hidden" name="subject" value={id} /><button className="btn-white py-2 text-sm">Jour suivant</button></form>
          </div>
        </details>
      )}
      {canManage && (
        <details className="card">
          <summary className="text-violet-700">⚙️ Modifier ou supprimer la matière</summary>
          <div className="mt-3 space-y-3">
            <form action={renommerMatiere} className="flex gap-2">
              <input type="hidden" name="subject" value={id} />
              <input name="nom" required defaultValue={s.nom} aria-label="Nom de la matière" className="input py-2" />
              <button className="btn-ghost w-auto shrink-0 py-2">Renommer</button>
            </form>
            <form action={supprimerMatiere}>
              <input type="hidden" name="subject" value={id} />
              <ConfirmButton message={`Supprimer « ${s.nom} » ? Les cours, quiz et résultats de cette matière seront définitivement effacés.`}
                className="btn border-2 border-rose-200 bg-rose-50/70 backdrop-blur-md py-2 text-rose-600">🗑 Supprimer la matière</ConfirmButton>
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
