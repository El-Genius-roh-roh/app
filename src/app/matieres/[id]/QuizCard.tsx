import Link from "next/link";
import { FORMATS, formatDuJour } from "@/lib/quiz/formats";
import { q } from "@/lib/db";
import { CONFIG } from "@/config/constants";
import { facteurRetard } from "@/lib/scoring";
import Icon from "@/components/Icon";

type Jour = { id: string; jour: number; date: string; retard: number; statut: string | null; erreurs: number | null; rang: number | null };

/** Quiz du jour d'une matière, et quiz manqués encore rattrapables (CONFIG.RATTRAPAGE_JOURS jours, D29). */
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

/** Liste « À rattraper » (dans un .hero bleu) : quiz manqués, gemmes réduites de 10 % par jour de retard. */
function Rattrapages({ liste }: { liste: Jour[] }) {
  if (!liste.length) return null;
  return (
    <div className="space-y-2 rounded-[14px] bg-accent-ombre/45 p-3">
      <p className="eyebrow">À rattraper</p>
      {liste.map((r) => {
        const reste = CONFIG.RATTRAPAGE_JOURS - r.retard;
        return (
          <Link key={r.id} href={`/quiz/${r.id}`} className="flex min-h-11 items-center gap-2 rounded-[12px] bg-surface px-3 py-2 text-sm text-texte transition-transform hover:-translate-y-px">
            <Icon name="calendar" size={16} className="text-accent" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Jour <span className="num">{r.jour}</span></span>
              <span className="block text-xs text-texte-3">
                {Math.round(facteurRetard(r.retard) * 100)}&nbsp;% des gemmes · {reste === 0 ? "dernier jour" : `encore ${reste + 1} j`}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-accent-fort">{r.statut === "en_cours" ? "Reprendre" : "Jouer"}<Icon name="arrowRight" size={15} /></span>
          </Link>
        );
      })}
    </div>
  );
}

/** Le panneau du moment (dans un .hero bleu) : le quiz du jour de la matière, à jouer, à reprendre, ou fait, et les rattrapages. */
export default async function QuizCard({ subjectId, userId, today }: { subjectId: string; userId: string; today: string }) {
  const { jour: d, rattrapages } = await quizDisponibles(subjectId, userId, today);
  if (!d) return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="eyebrow">Défi du jour</p>
        <p className="font-titre text-2xl font-extrabold">Pas de défi aujourd&apos;hui</p>
        <p className="text-sm opacity-90">Ajoute des cours ou des questions : le prochain quiz se prépare tout seul.</p>
      </div>
      <Rattrapages liste={rattrapages} />
    </div>
  );
  const fait = d.statut && d.statut !== "en_cours";
  const bonnes = CONFIG.QUESTIONS_PAR_JOUR - (d.erreurs ?? 0);
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Défi du jour · {FORMATS[formatDuJour(d.date)].titre}</p>
          <p className="mt-1.5 font-titre text-2xl leading-tight font-extrabold">{fait ? "Joué ! Ta correction t'attend." : `${FORMATS[formatDuJour(d.date)].titre} · ${CONFIG.QUESTIONS_PAR_JOUR} questions, un seul essai`}</p>
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
      <Rattrapages liste={rattrapages} />
    </div>
  );
}
