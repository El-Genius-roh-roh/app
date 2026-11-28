import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { dayQuestions, editableDays } from "@/lib/quiz/manual";
import { CONFIG } from "@/config/constants";
import NextButton from "@/components/NextButton";
import Icon from "@/components/Icon";
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
  const N = CONFIG.QUESTIONS_PAR_JOUR;

  return (
    <main className="page lg:max-w-3xl">
      <Link href={`/matieres/${id}`} className="back"><Icon name="arrowLeft" size={16} />{ctx.subject.nom}</Link>
      <header className="entree">
        <p className="eyebrow flex items-center gap-1.5"><Icon name="pencil" size={14} />Éditeur</p>
        <h1 className="title mt-1">Questions des prochains quiz</h1>
        <p className="mt-2 text-texte-2">Écris tes questions ou corrige celles générées. Les places libres sont complétées automatiquement.</p>
      </header>

      {days.length === 0 ? (
        <div className="card space-y-1">
          <p className="font-semibold">Aucun quiz à venir</p>
          <p className="muted">Les prochains quiz apparaîtront ici dès qu&apos;ils seront planifiés.</p>
        </div>
      ) : (
        <>
          <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-0.5 pb-2" aria-label="Quiz à venir">
            {days.map((d) => {
              const actif = d.id === day.id;
              return (
                <Link key={d.id} href={`?jour=${d.id}`} scroll={false} aria-current={actif ? "page" : undefined}
                  className={`flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center rounded-[14px] border-2 px-3 text-center leading-tight transition-colors ${actif ? "border-accent bg-accent text-sur-accent shadow-[0_3px_0_var(--color-accent-ombre)]" : "border-ligne bg-surface text-texte shadow-[0_3px_0_var(--color-ligne)] hover:border-ligne-forte"}`}>
                  <span className="num text-sm font-semibold">{jj(d.date)}</span>
                  <span className={`num text-xs ${actif ? "opacity-85" : d.nb >= N ? "text-ok" : "text-texte-3"}`}>{d.nb}/{N}</span>
                </Link>
              );
            })}
          </nav>

          <section className="space-y-3" aria-labelledby="t-quiz">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="t-quiz" className="h2">Quiz du {jj(day.date)}</h2>
              <span className="num text-sm text-texte-3">jour {day.jour} · {questions.length}/{N}</span>
            </div>
            <div className="flex gap-1" aria-hidden>
              {Array.from({ length: N }, (_, k) => <span key={k} className={`h-2 flex-1 rounded-full ${k < questions.length ? "bg-accent" : "bg-ligne"}`} />)}
            </div>
            {locked && (
              <p className="flex items-start gap-2 rounded-[14px] border-2 border-or/30 bg-or-doux p-3 text-sm font-semibold text-or">
                <Icon name="clock" size={17} className="mt-0.5 shrink-0" />Des joueurs ont déjà commencé ce quiz : il ne peut plus être modifié.
              </p>
            )}
            {!locked && questions.length === 0 && (
              <p className="card muted">Pas encore de question. Ajoute les tiennes ci-dessous : les places restantes seront complétées automatiquement (ou par le chat).</p>
            )}
            <ol className="space-y-3">
              {questions.map((qq, k) => (
                <QuestionItem key={qq.id} n={k + 1} q={qq} subjectId={id} dayId={day.id} docs={docs} locked={locked} />
              ))}
            </ol>
          </section>

          {!locked && questions.length < N && (
            <section className="card space-y-4" aria-labelledby="t-nouvelle">
              <h2 id="t-nouvelle" className="h2 flex items-center gap-2"><Icon name="plus" className="text-accent" />Nouvelle question</h2>
              <QuestionForm subjectId={id} dayId={day.id} docs={docs} />
            </section>
          )}
          {!locked && questions.length >= N && (
            <p className="card flex items-start gap-2 text-sm text-texte-2"><Icon name="check" size={17} className="mt-0.5 shrink-0 text-ok" />Ce quiz est complet ({N} questions). Supprime une question pour en ajouter une autre.</p>
          )}

          {next
            ? <NextButton href={`?jour=${next.id}`} sub={`${next.nb}/${N} questions`}>Quiz du {jj(next.date)}</NextButton>
            : <NextButton href={`/matieres/${id}`}>Retour à la matière</NextButton>}
        </>
      )}
    </main>
  );
}
