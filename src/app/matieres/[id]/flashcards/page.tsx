import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { sqlToday } from "@/lib/clock";
import { FLASHCARDS } from "@/config/constants";
import { cartes, type FlashSource } from "@/lib/flashcards";
import Icon from "@/components/Icon";
import FlashcardsJeu from "./FlashcardsJeu";

export const dynamic = "force-dynamic";

export default async function Flashcards({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const ctx = await getSubjectFor(id, u.id);
  if (!ctx) notFound();

  // comme l'Arène et le Memory : questions vérifiées des jours passés, pour ne rien dévoiler du quiz du jour
  const pool = await q<FlashSource>(
    `select qq.id, qq.type, qq.enonce, qq.choix, qq.correct_index, coalesce(qq.explication,'') as explication
       from questions qq join game_days g on g.id=qq.game_day_id
      where qq.subject_id=$1 and qq.verifiee and g.date < ${sqlToday("g.subject_id")}
      order by g.date desc, qq.id`, [id]);
  const source = cartes(pool);

  return (
    <main className="page">
      <Link href={`/matieres/${id}`} className="back"><Icon name="arrowLeft" size={16} />{ctx.subject.nom}</Link>
      <header className="entree space-y-1">
        <p className="eyebrow">Flashcards · {ctx.subject.nom}</p>
        <h1 className="title">Apprends à ton rythme</h1>
        <p className="muted max-w-xl">Lis la question, cherche la réponse dans ta tête, puis retourne la carte. Les cartes que tu ne savais pas reviennent jusqu&apos;à ce que tu les saches.</p>
      </header>
      {source.length < FLASHCARDS.MIN ? (
        <div className="card space-y-2">
          <p className="font-semibold">Pas encore assez de cartes</p>
          <p className="muted">Les flashcards sont générées à partir des quiz déjà passés : il en faut au moins {FLASHCARDS.MIN} (il y en a {source.length}). Joue quelques quiz du jour et reviens.</p>
          <Link href={`/matieres/${id}`} className="btn-white">Retour à la matière</Link>
        </div>
      ) : (
        <FlashcardsJeu subjectId={id} source={source} />
      )}
    </main>
  );
}
