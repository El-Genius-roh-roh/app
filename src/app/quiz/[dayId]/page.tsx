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
import { getDayRanking, getGroupRanking } from "@/lib/ranking";
import { exploitsDuJour, ligueDe } from "@/lib/trophees";
import { LigueBadge } from "@/components/Trophees";

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
    const jour = await getDayRanking(dayId);
    const ex = jour ? exploitsDuJour(jour.lines.map((l) => ({ ...l, dayId, date: jour.date })), u.id) : null;
    const ligue = ligueDe((await getGroupRanking(gd.group_id)).find((l) => l.userId === u.id)?.points ?? 0);
    return (
      <main className="page lg:max-w-3xl">
        {back}
        <section className="hero text-center">
          <p className="text-5xl">{score === items.length ? "🏆" : score >= items.length * 0.7 ? "🎉" : "💪"}</p>
          <p className="mt-1 text-5xl font-extrabold">{score}/{items.length}</p>
          <p className="mt-2 font-semibold text-white/90">{fmtMs(a.duree_ms)}{res ? ` · ${res.rang}${res.rang === 1 ? "er" : "e"} du jour` : ""}</p>
          {ex && (ex.premier || ex.sansFaute || ex.plusRapide) && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {ex.premier && <span className="chip bg-white/25 text-sm text-white">🏆 1er du jour !</span>}
              {ex.sansFaute && <span className="chip bg-white/25 text-sm text-white">🎯 Sans faute !</span>}
              {ex.plusRapide && <span className="chip bg-white/25 text-sm text-white">⚡ Le plus rapide !</span>}
            </div>
          )}
          {res && (
            <div className="mx-auto mt-4 max-w-sm space-y-2 rounded-2xl bg-white/15 p-3">
              <p className="flex items-center justify-center gap-2 text-sm font-bold">+{res.points} pts de ligue <LigueBadge ligue={ligue.ligue} /></p>
              <div className="h-2 overflow-hidden rounded-full bg-white/30"><div className="h-2 rounded-full bg-white" style={{ width: `${Math.round(ligue.progression * 100)}%` }} /></div>
              {ligue.suivante && <p className="text-xs font-semibold text-white/85">Encore {ligue.manque} pts pour {ligue.suivante.emoji} {ligue.suivante.nom}</p>}
            </div>
          )}
        </section>
        <Correction items={items} />
      </main>
    );
  }
  if (gd.date !== today) {
    return (
      <main className="page lg:max-w-3xl">
        {back}
        <p className="card font-semibold">{gd.date > today ? `Ce quiz ouvrira le ${gd.date}.` : "Quiz non joué : pas de rattrapage."}</p>
        {gd.date < today && items.length > 0 && <Correction items={items} />}
      </main>
    );
  }
  const initial = attempt ? await currentState(attempt as never) : null;
  return (
    <main className="page lg:max-w-3xl">
      {back}
      <QuizPlayer gameDayId={dayId} initial={initial} />
    </main>
  );
}
