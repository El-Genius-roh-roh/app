import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { sqlToday } from "@/lib/clock";
import { MEMORY } from "@/config/constants";
import { paires, pairesNotions, distribuer, type QuestionSource } from "@/lib/memory";
import { NOTIONS } from "@/config/constants";
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
  // notions du cours en priorité (D39) : une seule source par partie, pour que les paires restent du même genre
  const notions = await q<{ id: string; terme: string; definition: string }>("select id, terme, definition from notions where subject_id=$1", [id]);
  const parNotions = pairesNotions(notions, { notion: NOTIONS.TERME_MAX, definition: NOTIONS.MEMORY_DEFINITION_MAX });
  const modeNotions = parNotions.length >= MEMORY.MIN_PAIRES;
  const source = modeNotions ? parNotions : paires(pool, { notion: MEMORY.NOTION_MAX, definition: MEMORY.DEFINITION_MAX });
  const n = Math.min(MEMORY.PAIRES, source.length);

  return (
    <main className="page">
      <Link href={`/matieres/${id}`} className="back"><Icon name="arrowLeft" size={16} />{ctx.subject.nom}</Link>
      <header className="entree space-y-1">
        <p className="eyebrow">Memory · {ctx.subject.nom}</p>
        <h1 className="title">Retrouve les paires</h1>
        <p className="muted max-w-xl">{modeNotions
          ? <>Chaque notion du cours a sa définition cachée quelque part. Retourne deux cartes : une <b className="text-accent-fort">notion</b> et sa <b className="text-energie">définition</b>.</>
          : <>Chaque question a sa réponse cachée quelque part. Retourne deux cartes : une <b className="text-accent-fort">question</b> et sa <b className="text-energie">réponse</b>.</>}</p>
      </header>
      {source.length < MEMORY.MIN_PAIRES ? (
        <div className="card space-y-2">
          <p className="font-semibold">Pas encore assez de cartes</p>
          <p className="muted">Le Memory utilise les notions du cours, ou à défaut les questions des quiz déjà passés : il en faut au moins {MEMORY.MIN_PAIRES} (il y en a {source.length}). Joue quelques quiz du jour et reviens.</p>
          <Link href={`/matieres/${id}`} className="btn-white">Retour à la matière</Link>
        </div>
      ) : (
        <MemoryGame subjectId={id} source={source} initial={distribuer(source, n, Math.random)} n={n} />
      )}
    </main>
  );
}
