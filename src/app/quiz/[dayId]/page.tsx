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
import { getDayRanking, getGroupTrophees } from "@/lib/ranking";
import { exploitsDuJour, ligueDe } from "@/lib/trophees";
import { LigueBlason, TropheeIcone, TropheesCompteur } from "@/components/Trophees";
import NextButton from "@/components/NextButton";
import Icon from "@/components/Icon";

export default async function QuizPage({ params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  const u = await requireUser();
  const [gd] = await q<{ id: string; date: string; jour: number; subject_id: string; nom: string; group_id: string }>(
    `select g.id, to_char(g.date,'YYYY-MM-DD') as date, g.jour_dans_saison as jour, g.subject_id, s.nom, s.group_id
       from game_days g join subjects s on s.id=g.subject_id where g.id=$1`, [dayId]);
  if (!gd || !(await memberRole(gd.group_id, u.id))) notFound();
  const today = await todayParis(gd.subject_id);
  await closeStaleAttempts();
  const { attempt, items } = await getCorrection(dayId, u.id);
  const finished = attempt && attempt.statut !== "en_cours";
  const back = <Link href={`/matieres/${gd.subject_id}`} className="back"><Icon name="arrowLeft" size={16} />{gd.nom}</Link>;
  // suivant : le quiz du jour d'une autre matière du groupe pas encore joué, sinon retour à la matière
  const [autre] = await q<{ id: string; nom: string }>(
    `select g.id, s.nom from game_days g join subjects s on s.id=g.subject_id
      where s.group_id=$1 and s.id<>$2 and g.date=$3::date
        and not exists (select 1 from attempts a where a.game_day_id=g.id and a.user_id=$4 and a.statut<>'en_cours')
      order by s.created_at limit 1`, [gd.group_id, gd.subject_id, today, u.id]);
  const suivant = autre
    ? <NextButton href={`/quiz/${autre.id}`} sub="Quiz suivant">{autre.nom}</NextButton>
    : <NextButton href={`/matieres/${gd.subject_id}`} sub="Voir le classement">Retour à {gd.nom}</NextButton>;

  if (finished) {
    const a = attempt as typeof attempt & { erreurs: number; duree_ms: number };
    const [res] = await q<{ points: number; rang: number }>("select points,rang from daily_results where game_day_id=$1 and user_id=$2", [dayId, u.id]);
    const score = items.length - a.erreurs;
    const jour = await getDayRanking(dayId);
    const ex = jour ? exploitsDuJour(jour.lines.map((l) => ({ ...l, dayId, date: jour.date })), u.id) : null;
    const tr = await getGroupTrophees(gd.group_id);
    const mesTrophees = tr.lignes.find((l) => l.userId === u.id)?.trophees ?? 0;
    const delta = tr.deltas.get(dayId)?.get(u.id) ?? 0;
    const ligue = ligueDe(mesTrophees);
    return (
      <main className="page lg:max-w-3xl">
        {back}
        <section className="hero entree">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Résultat · jour {gd.jour}</p>
              <p className="num pop mt-2 text-7xl leading-none font-semibold">{score}<span className="text-3xl opacity-70">/{items.length}</span></p>
              <p className="num mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1"><Icon name="clock" size={15} />{fmtMs(a.duree_ms)}</span>
                {res && <span className="rounded-full bg-or-vif px-2.5 py-0.5 font-semibold text-sur-or">{res.rang === 1 ? "1er" : `${res.rang}e`} du jour</span>}
              </p>
            </div>
            {res && (
              <div className="flex items-center gap-3 rounded-[16px] bg-surface p-3 text-texte shadow-[0_4px_0_var(--color-accent-ombre)]">
                <LigueBlason ligue={ligue.ligue} size={44} />
                <div>
                  <p className={`num text-2xl leading-none font-semibold ${delta > 0 ? "text-ok" : delta < 0 ? "text-ko" : "text-texte-2"}`}>
                    {delta > 0 ? "+" : delta < 0 ? "−" : "±"}{Math.abs(delta)} <TropheeIcone size={18} />
                  </p>
                  <p className="mt-1 text-xs text-texte-2">Ligue {ligue.ligue.nom} · <TropheesCompteur n={mesTrophees} className="text-or" /></p>
                </div>
              </div>
            )}
          </div>
          {ex && (ex.premier || ex.sansFaute || ex.plusRapide) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {ex.premier && <span className="chip border-transparent bg-surface text-or"><Icon name="trophy" size={13} />1er du jour</span>}
              {ex.sansFaute && <span className="chip border-transparent bg-surface text-ok"><Icon name="target" size={13} />Sans faute</span>}
              {ex.plusRapide && <span className="chip border-transparent bg-surface text-accent-fort"><Icon name="clock" size={13} />Le plus rapide</span>}
            </div>
          )}
          {res && (
            <div className="mt-5 space-y-1.5">
              <div className="h-2.5 overflow-hidden rounded-full bg-accent-ombre/60" role="progressbar" aria-label={`Progression vers la ligue suivante`} aria-valuenow={Math.round(ligue.progression * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-2.5 rounded-full bg-or-vif" style={{ width: `${Math.round(ligue.progression * 100)}%` }} />
              </div>
              {ligue.suivante && <p className="text-xs opacity-90">Encore <span className="num font-semibold">{ligue.manque}</span> trophées pour la ligue {ligue.suivante.nom}</p>}
              {!jour?.fige && <p className="text-xs opacity-80">Provisoire : ça bouge encore si d&apos;autres joueurs font mieux aujourd&apos;hui.</p>}
            </div>
          )}
        </section>
        <Correction items={items} />
        {suivant}
      </main>
    );
  }
  if (gd.date !== today) {
    return (
      <main className="page lg:max-w-3xl">
        {back}
        <p className="card text-texte-2">{gd.date > today ? `Ce quiz ouvrira le ${gd.date}.` : "Quiz non joué : pas de rattrapage."}</p>
        {gd.date < today && items.length > 0 && <Correction items={items} />}
        {suivant}
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
