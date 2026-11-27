import Link from "next/link";
import { q } from "@/lib/db";
import { CONFIG } from "@/config/constants";

export default async function QuizCard({ subjectId, userId, today }: { subjectId: string; userId: string; today: string }) {
  const [d] = await q<{ id: string; jour: number; statut: string | null; erreurs: number | null; rang: number | null }>(
    `select g.id, g.jour_dans_saison as jour, a.statut, a.erreurs, r.rang
       from game_days g left join attempts a on a.game_day_id=g.id and a.user_id=$2
       left join daily_results r on r.game_day_id=g.id and r.user_id=$2
      where g.subject_id=$1 and g.date=$3::date`, [subjectId, userId, today]);
  if (!d) return <p className="font-semibold text-white/90">Pas de quiz aujourd&apos;hui.</p>;
  const fait = d.statut && d.statut !== "en_cours";
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold text-white/90">Quiz du jour {d.jour}</p>
        {fait && <p className="text-2xl font-extrabold">{CONFIG.QUESTIONS_PAR_JOUR - (d.erreurs ?? 0)}/{CONFIG.QUESTIONS_PAR_JOUR} {d.rang ? ` · ${d.rang}${d.rang === 1 ? "er" : "e"}` : ""}</p>}
      </div>
      <Link href={`/quiz/${d.id}`} className={fait ? "btn-white" : "btn bg-white text-xl text-fuchsia-600 shadow-lg"}>
        {fait ? "Voir ma correction" : d.statut === "en_cours" ? "▶ Reprendre" : "▶ Jouer"}
      </Link>
    </div>
  );
}
