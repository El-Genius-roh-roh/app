import Link from "next/link";
import { q } from "@/lib/db";
import { CONFIG } from "@/config/constants";
import Icon from "@/components/Icon";

/** Le panneau du moment (dans un .hero bleu) : le quiz du jour de la matière, à jouer, à reprendre, ou fait. */
export default async function QuizCard({ subjectId, userId, today }: { subjectId: string; userId: string; today: string }) {
  const [d] = await q<{ id: string; jour: number; statut: string | null; erreurs: number | null; rang: number | null }>(
    `select g.id, g.jour_dans_saison as jour, a.statut, a.erreurs, r.rang
       from game_days g left join attempts a on a.game_day_id=g.id and a.user_id=$2
       left join daily_results r on r.game_day_id=g.id and r.user_id=$2
      where g.subject_id=$1 and g.date=$3::date`, [subjectId, userId, today]);
  if (!d) return (
    <div className="space-y-1">
      <p className="eyebrow">Quiz du jour</p>
      <p className="font-titre text-2xl font-extrabold">Pas de quiz aujourd&apos;hui</p>
      <p className="text-sm opacity-90">Ajoute des cours ou des questions : le prochain quiz se prépare tout seul.</p>
    </div>
  );
  const fait = d.statut && d.statut !== "en_cours";
  const bonnes = CONFIG.QUESTIONS_PAR_JOUR - (d.erreurs ?? 0);
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Quiz du jour · jour <span className="num">{d.jour}</span></p>
          <p className="mt-1.5 font-titre text-2xl leading-tight font-extrabold">{fait ? "Joué ! Ta correction t'attend." : `${CONFIG.QUESTIONS_PAR_JOUR} questions, un seul essai`}</p>
          {!fait && <p className="mt-1 text-sm opacity-90">Le chrono démarre à la première question.</p>}
        </div>
        {fait && (
          <div className="shrink-0 text-right">
            <p className="num text-5xl leading-none font-semibold">{bonnes}<span className="text-2xl opacity-70">/{CONFIG.QUESTIONS_PAR_JOUR}</span></p>
            {d.rang && <p className="mt-2 inline-block rounded-full bg-or-vif px-2.5 py-0.5 font-num text-xs font-semibold text-sur-or">{d.rang === 1 ? "1er" : `${d.rang}e`} du jour</p>}
          </div>
        )}
      </div>
      <Link href={`/quiz/${d.id}`} className="btn-hero">
        {fait ? <>Voir ma correction<Icon name="arrowRight" size={20} /></> : <><Icon name="play" size={20} />{d.statut === "en_cours" ? "Reprendre le quiz" : "Jouer le quiz"}</>}
      </Link>
    </div>
  );
}
