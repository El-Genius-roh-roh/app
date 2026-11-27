import Link from "next/link";
import RankTable, { fmtMs, RankBadge } from "@/components/RankTable";
import { defaultSeason, getDayRanking, getSaisonTrophees, getSeasonHistory, getSeasons, pickDay } from "@/lib/ranking";
import ScoreChart from "@/components/ScoreChart";
import { exploitsDuJour } from "@/lib/trophees";
import { Exploits, GainGemmes, GainTrophees, GemmesCompteur } from "@/components/Trophees";
import { CONFIG } from "@/config/constants";

export default async function Classements({ subjectId, nom, groupId, userId, today, saisonParam }: { subjectId: string; nom: string; groupId: string; userId: string; today: string; saisonParam?: string }) {
  const seasons = await getSeasons(subjectId);
  if (seasons.length === 0) return null;
  const wanted = Number(saisonParam);
  const saison = seasons.some((s) => s.saison === wanted) ? wanted : defaultSeason(seasons, today);
  const info = seasons.find((s) => s.saison === saison)!;
  // gemmes : classement de la saison ; trophées : gagnés à la fin de la saison selon ce classement
  const st = await getSaisonTrophees(subjectId, nom, info);
  const dayId = await pickDay(subjectId, saison, today);
  const day = dayId ? await getDayRanking(dayId) : null;
  const history = await getSeasonHistory(subjectId, saison);
  const finies = seasons.filter((s) => s.termine && s.saison !== saison);
  const podiums = await Promise.all(finies.map((s) => getSaisonTrophees(subjectId, nom, s)));

  return (
    <>
      {seasons.length > 1 && (
        <div className="segmented">
          {seasons.map((s) => (
            <Link key={s.saison} href={`?saison=${s.saison}`} scroll={false} aria-current={s.saison === saison ? "page" : undefined}>Saison {s.saison}</Link>
          ))}
        </div>
      )}

      {day && (
        <section className="card space-y-3">
          <h2 className="h2">Classement du jour {day.date !== today && <span className="text-sm font-normal text-slate-500">(jour {day.jour})</span>}</h2>
          <RankTable meId={userId} groupId={groupId} empty="Personne n'a encore joué."
            lines={day.lines.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang, detail: `${CONFIG.QUESTIONS_PAR_JOUR - l.erreurs}/${CONFIG.QUESTIONS_PAR_JOUR} · ${fmtMs(l.dureeMs)}`,
              badge: <><Exploits {...exploitsDuJour(day.lines.map((x) => ({ ...x, dayId: day.dayId, date: day.date })), l.userId)} /><GainGemmes n={l.points} retard={l.retard} /></> }))} />
        </section>
      )}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h2">Classement de la saison{seasons.length > 1 ? ` ${saison}` : ""}</h2>
          <p className="muted">{info.termine ? "Saison terminée" : `Fin le ${info.fin.slice(8)}/${info.fin.slice(5, 7)}`}</p>
        </div>
        <RankTable meId={userId} groupId={groupId} empty="Personne n'a encore joué cette saison."
          lines={st.classement.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang,
            badge: <><GemmesCompteur n={l.points} className="text-sm text-slate-700" /><GainTrophees n={l.trophees} provisoire={!info.termine} /></> }))} />
        <p className="muted">
          {info.termine ? "Trophées gagnés" : "Trophées en jeu si la saison s'arrêtait aujourd'hui"} : {st.nbJours} par joueur classé derrière soi
          ({st.nbJours} jours de saison).
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Évolution</h2>
        <ScoreChart data={history} meId={userId} maxQuestions={CONFIG.QUESTIONS_PAR_JOUR} />
      </section>

      {podiums.length > 0 && (
        <section className="card space-y-2">
          <h2 className="h2">Saisons terminées</h2>
          {podiums.map((p) => (
            <div key={p.saison} className="rounded-2xl bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-500">Saison {p.saison}</p>
              {p.classement.length === 0 ? <p className="muted">Personne n&apos;a joué.</p> : p.classement.slice(0, 3).map((l) => (
                <p key={l.userId} className="flex items-center gap-2"><RankBadge rang={l.rang} /> {l.pseudo} <GainTrophees n={l.trophees} /></p>
              ))}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
