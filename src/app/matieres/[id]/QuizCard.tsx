import Link from "next/link";
import { q } from "@/lib/db";
import { CONFIG } from "@/config/constants";
import Icon from "@/components/Icon";

/** Le panneau du moment : le quiz du jour de la matière (à jouer, à reprendre, ou fait avec score et rang). */
export default async function QuizCard({ subjectId, userId, today }: { subjectId: string; userId: string; today: string }) {
  const [d] = await q<{ id: string; jour: number; statut: string | null; erreurs: number | null; rang: number | null }>(
    `select g.id, g.jour_dans_saison as jour, a.statut, a.erreurs, r.rang
       from game_days g left join attempts a on a.game_day_id=g.id and a.user_id=$2
       left join daily_results r on r.game_day_id=g.id and r.user_id=$2
      where g.subject_id=$1 and g.date=$3::date`, [subjectId, userId, today]);
  if (!d) return <p className="text-texte-2">Pas de quiz aujourd&apos;hui.</p>;
  const fait = d.statut && d.statut !== "en_cours";
  const bonnes = CONFIG.QUESTIONS_PAR_JOUR - (d.erreurs ?? 0);
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-accent">Quiz du jour {d.jour}</p>
          <p className="mt-1 text-texte-2">{fait ? "Joué. Ta correction t'attend." : `${CONFIG.QUESTIONS_PAR_JOUR} questions, une seule tentative, chrono lancé à la 1re.`}</p>
        </div>
        {fait && (
          <div className="text-right">
            <p className="num text-4xl leading-none font-bold">{bonnes}<span className="text-xl text-texte-3">/{CONFIG.QUESTIONS_PAR_JOUR}</span></p>
            {d.rang && <p className="num mt-1 text-sm font-semibold text-or">{d.rang === 1 ? "1er" : `${d.rang}e`} du jour</p>}
          </div>
        )}
      </div>
      <Link href={`/quiz/${d.id}`} className={fait ? "btn-white" : "btn-primary min-h-13 text-base"}>
        {fait ? <>Voir ma correction<Icon name="arrowRight" size={18} /></> : <><Icon name="play" size={18} />{d.statut === "en_cours" ? "Reprendre le quiz" : "Jouer le quiz"}</>}
      </Link>
    </div>
  );
}
