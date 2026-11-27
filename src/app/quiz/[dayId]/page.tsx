import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";
import { todayParis } from "@/lib/clock";
import { ranges } from "@/lib/subjects";
import { closeStaleAttempts, currentState, dayProgramme, getCorrection } from "@/lib/quiz/service";
import QuizPlayer from "@/components/QuizPlayer";
import Correction from "@/components/Correction";
import { url } from "@/lib/url";

const fmtTime = (ms: number) => `${Math.floor(ms / 60000)} min ${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")} s`;

export default async function QuizPage({ params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  const u = await requireUser();
  const [gd] = await q<{ id: string; date: string; saison: number; jour: number; subject_id: string; nom: string; group_id: string; statut: string }>(
    `select g.id, to_char(g.date,'YYYY-MM-DD') as date, g.saison, g.jour_dans_saison as jour, g.subject_id, s.nom, s.group_id, g.statut_generation as statut
       from game_days g join subjects s on s.id=g.subject_id where g.id=$1`, [dayId]);
  if (!gd || !(await memberRole(gd.group_id, u.id))) notFound();
  const today = await todayParis();
  await closeStaleAttempts();
  const { attempt, items } = await getCorrection(dayId, u.id);
  const prog = await dayProgramme(dayId);
  const finished = attempt && attempt.statut !== "en_cours";

  const header = (
    <header>
      <Link href={`/matieres/${gd.subject_id}`} className="text-sm text-indigo-600">← {gd.nom}</Link>
      <h1 className="text-xl font-bold">Quiz · saison {gd.saison}, jour {gd.jour}</h1>
      <p className="text-xs text-gray-500">{gd.date}{gd.date === today ? " · aujourd'hui" : ""}</p>
    </header>
  );
  const programme = (
    <section className="rounded bg-indigo-50 p-3 text-sm">
      <h2 className="font-semibold">Slides au programme</h2>
      {prog.length === 0 ? <p className="text-xs text-gray-600">Jour de révision : questions sur les jours précédents.</p> : prog.map((p) => (
        <p key={p.doc_id} className="text-xs"><span className="text-gray-700">{p.chapitres.join(" · ")}</span> —{" "}
          <a className="text-indigo-700 underline" target="_blank" href={url(`/api/documents/${p.doc_id}/file#page=${p.numeros[0]}`)}>{p.doc_nom} p.{ranges(p.numeros)}</a></p>
      ))}
    </section>
  );

  if (finished) {
    const a = attempt as typeof attempt & { erreurs: number; duree_ms: number };
    const [res] = await q<{ points: number; rang: number; provisoire: boolean }>("select points,rang,provisoire from daily_results where game_day_id=$1 and user_id=$2", [dayId, u.id]);
    return (
      <main className="mx-auto max-w-md p-4 space-y-4">
        {header}
        <section className="rounded border p-3 text-center">
          <p className="text-3xl font-bold">{items.length - a.erreurs} / {items.length}</p>
          <p className="text-sm text-gray-600">{a.erreurs} erreur(s) · {fmtTime(a.duree_ms)}{a.statut === "cloturee" ? " · tentative clôturée" : ""}</p>
          {res && <p className="mt-1 text-sm">Rang provisoire : <b>{res.rang}</b> · <b>{res.points} pts</b></p>}
        </section>
        <h2 className="font-semibold">Correction</h2>
        <Correction items={items} />
        {programme}
      </main>
    );
  }
  if (gd.date < today) {
    return (
      <main className="mx-auto max-w-md p-4 space-y-4">
        {header}
        <p className="rounded bg-gray-100 p-3 text-sm">Quiz non joué : 0 point, pas de rattrapage. Tu peux relire les questions et leurs corrections.</p>
        {items.length ? <Correction items={items} /> : <p className="text-sm text-gray-500">Aucune question n&apos;avait été générée ce jour-là.</p>}
      </main>
    );
  }
  if (gd.date > today) {
    return (
      <main className="mx-auto max-w-md p-4 space-y-4">
        {header}
        <p className="rounded bg-gray-100 p-3 text-sm">Ce quiz sera disponible le {gd.date} (de 00h00 à 23h59, heure de Paris). Révise les slides ci-dessous.</p>
        {programme}
      </main>
    );
  }
  const initial = attempt ? await currentState(attempt as never) : null;
  return (
    <main className="mx-auto max-w-md p-4 space-y-4">
      {header}
      {!initial && programme}
      <QuizPlayer gameDayId={dayId} initial={initial} />
    </main>
  );
}
