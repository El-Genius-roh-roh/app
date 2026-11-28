import Link from "next/link";
import { ArrowUp, BookOpen, FileText, ListChecks, MessageSquare, Settings, Trash2 } from "lucide-react";
import { etatGenerationIA, llmConfigured, preparerEnArrierePlan } from "@/lib/quiz/ai";
import IaPanel from "./IaPanel";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { importer, supprimer, monter, genererQuiz, jourSuivant, renommerMatiere, supprimerMatiere } from "./actions";
import ConfirmButton from "@/components/ConfirmButton";
import DropZone from "@/components/DropZone";
import NextButton from "@/components/NextButton";
import { todayParis } from "@/lib/clock";
import AutoRefresh from "@/components/AutoRefresh";
import QuizCard from "./QuizCard";
import Classements from "./Classements";
import { url } from "@/lib/url";

type Doc = { id: string; nom: string; categorie: "cours" | "annale"; ordre: number; statut: "traitement" | "pret" | "erreur"; erreur: string | null };
const STATUT = { traitement: "bg-amber-400 animate-pulse", pret: "bg-emerald-500", erreur: "bg-rose-500" } as const;
const STATUT_TXT = { traitement: "Analyse en cours", pret: "Prêt", erreur: "Erreur" } as const;

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

  const DocBox = ({ categorie, titre, icone, couleur }: { categorie: "cours" | "annale"; titre: string; icone: React.ReactNode; couleur: string }) => {
    const list = docs.filter((d) => d.categorie === categorie);
    return (
      <section className="card space-y-3">
        <h2 className={`h2 flex items-center gap-2 ${couleur}`}>{icone}{titre}</h2>
        {list.length === 0 && <p className="muted">Aucun PDF.</p>}
        <ul className="space-y-2">
          {list.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
              <span title={d.erreur ?? STATUT_TXT[d.statut]} aria-label={STATUT_TXT[d.statut]} className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUT[d.statut]}`} />
              <a href={url(`/api/documents/${d.id}/file`)} target="_blank" className="flex-1 truncate font-medium hover:underline">{d.nom}</a>
              {canManage && categorie === "cours" && d.ordre > 1 && (
                <form action={monter}>
                  <input type="hidden" name="subject" value={id} /><input type="hidden" name="doc" value={d.id} />
                  <button title="Monter" aria-label={`Monter ${d.nom}`} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-accent-600 transition hover:bg-accent-100">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </form>
              )}
              {canManage && (
                <form action={supprimer}>
                  <input type="hidden" name="subject" value={id} /><input type="hidden" name="doc" value={d.id} />
                  <button title="Supprimer" aria-label={`Supprimer ${d.nom}`} className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {canManage && <DropZone action={importer} subjectId={id} categorie={categorie} />}
      </section>
    );
  };

  return (
    <main className="page">
      <AutoRefresh every={enCours || etatIA?.enCours ? 3000 : 15000} />
      <Link href={`/groupes/${s.group_id}`} className="back">Groupe</Link>
      <header className="hero space-y-4">
        <h1 className="title">{s.nom}</h1>
        <QuizCard subjectId={id} userId={u.id} today={today} />
      </header>

      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-5">
          <Classements subjectId={id} nom={s.nom} groupId={s.group_id} userId={u.id} today={today} saisonParam={saisonParam} />
        </div>
        <div className="space-y-5">
          {canManage && llmConfigured() && <IaPanel subjectId={id} etat={etatIA} secondes={etatIA?.enCours ? Math.round((Date.now() - etatIA.debut) / 1000) : 0} />}
          {canManage && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/matieres/${id}/chat`} className="btn-orange"><MessageSquare className="h-4 w-4" /> Générer avec le chat</Link>
              <Link href={`/matieres/${id}/questions`} className="btn-white"><ListChecks className="h-4 w-4" /> Gérer les questions</Link>
            </div>
          )}
          <DocBox categorie="cours" titre="Cours" icone={<BookOpen className="h-5 w-5" />} couleur="text-sky-600" />
          <DocBox categorie="annale" titre="Annales" icone={<FileText className="h-5 w-5" />} couleur="text-orange-600" />
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
          <summary className="inline-flex items-center gap-2 font-semibold text-accent-700"><Settings className="h-4 w-4" /> Paramètres de la matière</summary>
          <div className="mt-3 space-y-3">
            <form action={renommerMatiere} className="flex gap-2">
              <input type="hidden" name="subject" value={id} />
              <input name="nom" required defaultValue={s.nom} aria-label="Nom de la matière" className="input py-2" />
              <button className="btn-ghost w-auto shrink-0 py-2">Renommer</button>
            </form>
            <form action={supprimerMatiere}>
              <input type="hidden" name="subject" value={id} />
              <ConfirmButton message={`Supprimer « ${s.nom} » ? Les cours, quiz et résultats de cette matière seront définitivement effacés.`}
                className="btn bg-rose-50 hover:bg-rose-100 py-2 text-rose-600">Supprimer la matière</ConfirmButton>
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
