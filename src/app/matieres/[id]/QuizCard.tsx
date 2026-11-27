import Link from "next/link";
import { q } from "@/lib/db";
import { CONFIG } from "@/config/constants";
import { facteurRetard } from "@/lib/scoring";

type Jour = { id: string; jour: number; date: string; retard: number; statut: string | null; erreurs: number | null; rang: number | null };

/** Quiz du jour d'une matière, et quiz manqués encore rattrapables (CONFIG.RATTRAPAGE_JOURS jours). */
export async function quizDisponibles(subjectId: string, userId: string, today: string): Promise<{ jour: Jour | null; rattrapages: Jour[] }> {
  const rows = await q<Jour>(
    `select g.id, g.jour_dans_saison as jour, to_char(g.date,'YYYY-MM-DD') as date, ($3::date - g.date)::int as retard, a.statut, a.erreurs, r.rang
       from game_days g left join attempts a on a.game_day_id=g.id and a.user_id=$2
       left join daily_results r on r.game_day_id=g.id and r.user_id=$2
      where g.subject_id=$1 and g.date between $3::date - $4::int and $3::date order by g.date desc`,
    [subjectId, userId, today, CONFIG.RATTRAPAGE_JOURS]);
  return {
    jour: rows.find((r) => r.retard === 0) ?? null,
    rattrapages: rows.filter((r) => r.retard > 0 && (!r.statut || r.statut === "en_cours")),
  };
}

export default async function QuizCard({ subjectId, userId, today }: { subjectId: string; userId: string; today: string }) {
  const { jour: d, rattrapages } = await quizDisponibles(subjectId, userId, today);
  const fait = d?.statut && d.statut !== "en_cours";
  return (
    <div className="space-y-3">
      {!d ? <p className="text-white/90">Pas de quiz aujourd&apos;hui.</p> : (
        <>
          <div className="flex items-baseline justify-between">
            <p className="text-white/90">Quiz du jour {d.jour}</p>
            {fait && <p className="text-2xl font-bold tabular-nums">{CONFIG.QUESTIONS_PAR_JOUR - (d.erreurs ?? 0)}/{CONFIG.QUESTIONS_PAR_JOUR}{d.rang ? ` · ${d.rang}${d.rang === 1 ? "er" : "e"}` : ""}</p>}
          </div>
          <Link href={`/quiz/${d.id}`} className={fait ? "btn-white" : "btn-hero"}>
            {fait ? "Voir ma correction" : d.statut === "en_cours" ? "Reprendre" : "Jouer"}
          </Link>
        </>
      )}
      {rattrapages.length > 0 && (
        <div className="space-y-2 rounded-2xl bg-white/15 p-3">
          <p className="text-sm font-semibold">À rattraper</p>
          {rattrapages.map((r) => (
            <Link key={r.id} href={`/quiz/${r.id}`} className="flex items-center justify-between rounded-xl bg-white/20 px-3 py-2 text-sm transition hover:bg-white/30">
              <span>Jour {r.jour} · {r.statut === "en_cours" ? "reprendre" : "jouer"}</span>
              <span className="text-white/80">{Math.round(facteurRetard(r.retard) * 100)} % des gemmes · {CONFIG.RATTRAPAGE_JOURS - r.retard === 0 ? "dernier jour" : `encore ${CONFIG.RATTRAPAGE_JOURS - r.retard + 1} j`}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
