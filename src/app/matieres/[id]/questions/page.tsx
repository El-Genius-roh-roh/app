import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { dayQuestions, editableDays } from "@/lib/quiz/manual";
import { CONFIG } from "@/config/constants";
import NextButton from "@/components/NextButton";
import QuestionItem from "./QuestionItem";
import QuestionForm from "./QuestionForm";

const jj = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;

export default async function Questions({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ jour?: string }> }) {
  const { id } = await params;
  const { jour } = await searchParams;
  const u = await requireUser();
  const ctx = await getSubjectFor(id, u.id);
  if (!ctx || !ctx.canManage) notFound();

  const days = await editableDays(id);
  const i = Math.max(0, days.findIndex((d) => d.id === jour));
  const day = days[i];
  const questions = day ? await dayQuestions(day.id) : [];
  const docs = await q<{ id: string; nom: string; nb_pages: number | null }>(
    "select id,nom,nb_pages from documents where subject_id=$1 and categorie='cours' and statut='pret' order by ordre", [id]);
  const locked = !!day?.joue;
  const next = days[i + 1];

  return (
    <main className="page lg:max-w-3xl">
      <Link href={`/matieres/${id}`} className="back">{ctx.subject.nom}</Link>
      <header className="hero">
        <h1 className="text-3xl">Questions</h1>
        <p className="mt-1 font-semibold text-white/90">Crée ou corrige les questions des prochains quiz.</p>
      </header>

      {days.length === 0 ? <p className="card font-semibold">Aucun quiz à venir.</p> : (
        <>
          <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {days.map((d) => (
              <Link key={d.id} href={`?jour=${d.id}`} scroll={false}
                className={`shrink-0 rounded-2xl px-3 py-2 text-center text-sm leading-tight shadow-sm ${d.id === day.id ? "bg-accent-600 text-white" : "bg-white/60 backdrop-blur-md text-accent-700"}`}>
                {jj(d.date)}<br /><span className="font-sans text-xs font-semibold opacity-80">{d.nb}/{CONFIG.QUESTIONS_PAR_JOUR}</span>
              </Link>
            ))}
          </nav>

          <section className="space-y-3">
            <h2 className="h2">Quiz du {jj(day.date)} <span className="font-sans text-sm font-semibold text-slate-500">· jour {day.jour}</span></h2>
            {locked && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">Des joueurs ont déjà commencé ce quiz : il ne peut plus être modifié.</p>}
            {!locked && questions.length === 0 && (
              <p className="muted">Pas encore de questions. Ajoute les tiennes ci-dessous : les places restantes seront complétées automatiquement (ou par le chat).</p>
            )}
            {!locked && questions.length > 0 && questions.length < CONFIG.QUESTIONS_PAR_JOUR && (
              <p className="rounded-2xl bg-sky-50 p-3 text-sm font-semibold text-sky-700">
                {questions.length}/{CONFIG.QUESTIONS_PAR_JOUR} questions : les places libres seront complétées automatiquement.
              </p>
            )}
            <ol className="space-y-3">
              {questions.map((qq, k) => (
                <QuestionItem key={qq.id} n={k + 1} q={qq} subjectId={id} dayId={day.id} docs={docs} locked={locked} />
              ))}
            </ol>
          </section>

          {!locked && questions.length < CONFIG.QUESTIONS_PAR_JOUR && (
            <section className="card space-y-3">
              <h2 className="h2 text-orange-600">＋ Nouvelle question</h2>
              <QuestionForm subjectId={id} dayId={day.id} docs={docs} />
            </section>
          )}
          {!locked && questions.length >= CONFIG.QUESTIONS_PAR_JOUR && (
            <p className="muted">Ce quiz est complet ({CONFIG.QUESTIONS_PAR_JOUR} questions). Supprime une question pour en ajouter une autre.</p>
          )}

          {next
            ? <NextButton href={`?jour=${next.id}`} sub={`${next.nb}/${CONFIG.QUESTIONS_PAR_JOUR} questions`}>Quiz du {jj(next.date)}</NextButton>
            : <NextButton href={`/matieres/${id}`}>Retour à la matière</NextButton>}
        </>
      )}
    </main>
  );
}
