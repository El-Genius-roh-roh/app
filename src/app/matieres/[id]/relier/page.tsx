import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { accesJeux } from "@/lib/acces";
import JeuxVerrouilles from "@/components/JeuxVerrouilles";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { sqlToday } from "@/lib/clock";
import { RELIER } from "@/config/constants";
import { paires, pairesNotions, type QuestionSource } from "@/lib/memory";
import { donne } from "@/lib/relier";
import Icon from "@/components/Icon";
import RelierJeu from "./RelierJeu";

export const dynamic = "force-dynamic";

/** Mini-jeu « Relier » (D40) : relier chaque notion du cours à sa définition (à défaut, chaque question à sa réponse). */
export default async function Relier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const ctx = await getSubjectFor(id, u.id);
  if (!ctx) notFound();
  const acces = await accesJeux(u.id);
  if (!acces.ouvert) return <JeuxVerrouilles jeu="Relier" acces={acces} retour={{ href: `/matieres/${id}`, label: ctx.subject.nom }} />;

  // mêmes sources que le Memory : notions du cours en priorité, sinon questions vérifiées des jours passés (rien du quiz du jour)
  const notions = await q<{ id: string; terme: string; definition: string }>("select id, terme, definition from notions where subject_id=$1", [id]);
  const max = { notion: RELIER.TERME_MAX, definition: RELIER.DEFINITION_MAX };
  const parNotions = pairesNotions(notions, max);
  const modeNotions = parNotions.length >= RELIER.MIN_PAIRES;
  const source = modeNotions ? parNotions : paires(await q<QuestionSource>(
    `select qq.id, qq.type, qq.enonce, qq.choix, qq.correct_index
       from questions qq join game_days g on g.id=qq.game_day_id
      where qq.subject_id=$1 and qq.verifiee and g.date < ${sqlToday("g.subject_id")}`, [id]), max);

  return (
    <main className="page">
      <Link href={`/matieres/${id}`} className="back"><Icon name="arrowLeft" size={16} />{ctx.subject.nom}</Link>
      <header className="entree space-y-1">
        <p className="eyebrow">Mini-jeu · {ctx.subject.nom}</p>
        <h1 className="title">Relie les paires</h1>
        <p className="muted max-w-xl">{modeNotions
          ? <>Touche une <b className="text-accent-fort">notion</b>, puis la <b className="text-energie">définition</b> qui va avec. Le moins d&apos;erreurs possible !</>
          : <>Touche une <b className="text-accent-fort">question</b>, puis la <b className="text-energie">réponse</b> qui va avec. Le moins d&apos;erreurs possible !</>}</p>
      </header>
      {source.length < RELIER.MIN_PAIRES ? (
        <div className="card space-y-2">
          <p className="font-semibold">Pas encore assez de paires</p>
          <p className="muted">Relier utilise les notions du cours, ou à défaut les questions des quiz déjà passés : il en faut au moins {RELIER.MIN_PAIRES} (il y en a {source.length}). Joue quelques quiz du jour et reviens.</p>
          <Link href={`/matieres/${id}`} className="btn-white">Retour à la matière</Link>
        </div>
      ) : (
        <RelierJeu subjectId={id} source={source} initial={donne(source, RELIER.PAIRES, Math.random)} notions={modeNotions} />
      )}
    </main>
  );
}
