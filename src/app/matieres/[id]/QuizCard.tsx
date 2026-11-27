import Link from "next/link";
import { q } from "@/lib/db";
import { getSeasonRanking } from "@/lib/ranking";

export default async function QuizCard({ subjectId, userId, today }: { subjectId: string; userId: string; today: string }) {
  const [d] = await q<{ id: string; saison: number; jour: number; statut: string | null; erreurs: number | null; points: number | null }>(
    `select g.id, g.saison, g.jour_dans_saison as jour, a.statut, a.erreurs, r.points
       from game_days g left join attempts a on a.game_day_id=g.id and a.user_id=$2
       left join daily_results r on r.game_day_id=g.id and r.user_id=$2
      where g.subject_id=$1 and g.date=$3::date`, [subjectId, userId, today]);
  const histo = (<Link href={`/matieres/${subjectId}/historique`} className="text-xs text-indigo-700 underline">Historique des quiz</Link>);
  if (!d) return <section className="rounded border p-3 text-sm text-gray-600">Pas de quiz aujourd&apos;hui. {histo}</section>;
  const fait = d.statut && d.statut !== "en_cours";
  const rank = (await getSeasonRanking(subjectId, d.saison)).find((l) => l.userId === userId);
  return (
    <section className="space-y-2 rounded border-2 border-indigo-500 p-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Quiz du jour · saison {d.saison}, jour {d.jour}</h2>
        {fait && <span className="text-sm font-semibold text-green-700">{10 - (d.erreurs ?? 0)}/10 · {d.points ?? 0} pts</span>}
      </div>
      {rank && <p className="text-xs text-gray-600">Ma position en saison : <b>n°{rank.rang}</b> · {rank.points} pts</p>}
      <Link href={`/quiz/${d.id}`} className="block rounded bg-indigo-600 p-2 text-center text-white">
        {fait ? "Voir ma correction" : d.statut === "en_cours" ? "Reprendre le quiz" : "Jouer"}
      </Link>
      {histo}
    </section>
  );
}
