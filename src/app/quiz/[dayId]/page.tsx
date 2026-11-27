import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";
import { todayParis } from "@/lib/clock";
import { closeStaleAttempts, currentState, getCorrection } from "@/lib/quiz/service";
import QuizPlayer from "@/components/QuizPlayer";
import Correction from "@/components/Correction";
import { fmtMs } from "@/components/RankTable";

export default async function QuizPage({ params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  const u = await requireUser();
  const [gd] = await q<{ id: string; date: string; jour: number; subject_id: string; nom: string; group_id: string }>(
    `select g.id, to_char(g.date,'YYYY-MM-DD') as date, g.jour_dans_saison as jour, g.subject_id, s.nom, s.group_id
       from game_days g join subjects s on s.id=g.subject_id where g.id=$1`, [dayId]);
  if (!gd || !(await memberRole(gd.group_id, u.id))) notFound();
  const today = await todayParis();
  await closeStaleAttempts();
  const { attempt, items } = await getCorrection(dayId, u.id);
  const finished = attempt && attempt.statut !== "en_cours";
  const back = <Link href={`/matieres/${gd.subject_id}`} className="back">← {gd.nom}</Link>;

  if (finished) {
    const a = attempt as typeof attempt & { erreurs: number; duree_ms: number };
    const [res] = await q<{ points: number; rang: number }>("select points,rang from daily_results where game_day_id=$1 and user_id=$2", [dayId, u.id]);
    const score = items.length - a.erreurs;
    return (
      <main className="page">
        {back}
        <section className="hero text-center">
          <p className="text-5xl">{score === items.length ? "🏆" : score >= items.length * 0.7 ? "🎉" : "💪"}</p>
          <p className="mt-1 text-5xl font-extrabold">{score}/{items.length}</p>
          <p className="mt-2 font-semibold text-white/90">{fmtMs(a.duree_ms)}{res ? ` · ${res.points} pts · ${res.rang}${res.rang === 1 ? "er" : "e"}` : ""}</p>
        </section>
        <Correction items={items} />
      </main>
    );
  }
  if (gd.date !== today) {
    return (
      <main className="page">
        {back}
        <p className="card font-semibold">{gd.date > today ? `Ce quiz ouvrira le ${gd.date}.` : "Quiz non joué : pas de rattrapage."}</p>
        {gd.date < today && items.length > 0 && <Correction items={items} />}
      </main>
    );
  }
  const initial = attempt ? await currentState(attempt as never) : null;
  return (
    <main className="page">
      {back}
      <QuizPlayer gameDayId={dayId} initial={initial} />
    </main>
  );
}
