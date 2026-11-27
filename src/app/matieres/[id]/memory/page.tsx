import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { sqlToday } from "@/lib/clock";
import { MEMORY } from "@/config/constants";
import { paires, distribuer, type QuestionSource } from "@/lib/memory";
import Icon from "@/components/Icon";
import MemoryGame from "./MemoryGame";

export const dynamic = "force-dynamic";

export default async function Memory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const ctx = await getSubjectFor(id, u.id);
  if (!ctx) notFound();

  // comme l'Arène : uniquement les questions vérifiées des jours passés, pour ne rien dévoiler du quiz du jour
  const pool = await q<QuestionSource>(
    `select qq.id, qq.type, qq.enonce, qq.choix, qq.correct_index
       from questions qq join game_days g on g.id=qq.game_day_id
      where qq.subject_id=$1 and qq.verifiee and g.date < ${sqlToday("g.subject_id")}`, [id]);
  const source = paires(pool, { notion: MEMORY.NOTION_MAX, definition: MEMORY.DEFINITION_MAX });
  const n = Math.min(MEMORY.PAIRES, source.length);

  return (
    <main className="page">
      <Link href={`/matieres/${id}`} className="back"><Icon name="arrowLeft" size={16} />{ctx.subject.nom}</Link>
      <header className="entree space-y-1">
        <p className="eyebrow">Memory · {ctx.subject.nom}</p>
        <h1 className="title">Retrouve les paires</h1>
        <p className="muted max-w-xl">Chaque question a sa réponse cachée quelque part. Retourne deux cartes : une <b className="text-accent-fort">question</b> et sa <b className="text-energie">réponse</b>.</p>
      </header>
      {source.length < MEMORY.MIN_PAIRES ? (
        <div className="card space-y-2">
          <p className="font-semibold">Pas encore assez de cartes</p>
          <p className="muted">Le Memory utilise les questions des quiz déjà passés : il en faut au moins {MEMORY.MIN_PAIRES} (il y en a {source.length}). Joue quelques quiz du jour et reviens.</p>
          <Link href={`/matieres/${id}`} className="btn-white">Retour à la matière</Link>
        </div>
      ) : (
        <MemoryGame subjectId={id} source={source} initial={distribuer(source, n, Math.random)} n={n} />
      )}
    </main>
  );
}
