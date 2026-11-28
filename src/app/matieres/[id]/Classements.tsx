import Link from "next/link";
import RankTable, { fmtMs, RankBadge } from "@/components/RankTable";
import { defaultSeason, getDayRanking, getSaisonClassement, getSeasonHistory, getSeasons, pickDay } from "@/lib/ranking";
import ScoreChart from "@/components/ScoreChart";
import { exploitsDuJour } from "@/lib/trophees";
import { Exploits, GainGemmes, GemmesCompteur } from "@/components/Trophees";
import { CONFIG } from "@/config/constants";
import Details from "@/components/Details";

export default async function Classements({ subjectId, nom, groupId, userId, today, saisonParam }: { subjectId: string; nom: string; groupId: string; userId: string; today: string; saisonParam?: string }) {
  const seasons = await getSeasons(subjectId);
  if (seasons.length === 0) return null;
  const wanted = Number(saisonParam);
  const saison = seasons.some((s) => s.saison === wanted) ? wanted : defaultSeason(seasons, today);
  const info = seasons.find((s) => s.saison === saison)!;
  // classement de la saison aux gemmes (les trophées se gagnent à la semaine, dans le groupe : D36)
  const st = await getSaisonClassement(subjectId, nom, info);
  const dayId = await pickDay(subjectId, saison, today);
  const day = dayId ? await getDayRanking(dayId) : null;
  const history = await getSeasonHistory(subjectId, saison);
  const finies = seasons.filter((s) => s.termine && s.saison !== saison);
  const podiums = await Promise.all(finies.map((s) => getSaisonClassement(subjectId, nom, s)));
  const jj = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;

  return (
    <>
      {seasons.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label="Saisons">
          {seasons.map((s) => (
            <Link key={s.saison} href={`?saison=${s.saison}`} scroll={false} aria-current={s.saison === saison ? "page" : undefined}
              className={`chip min-h-9 px-3 ${s.saison === saison ? "border-accent bg-accent text-sur-accent" : "hover:border-texte-3"}`}>Saison {s.saison}</Link>
          ))}
        </nav>
      )}

      {day && (
        <section className="space-y-3">
          <h2 className="eyebrow">Classement du jour {day.date !== today && <span className="normal-case tracking-normal">(jour {day.jour})</span>}</h2>
          <RankTable meId={userId} groupId={groupId} empty="Personne n'a encore joué."
            lines={day.lines.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang, detail: `${CONFIG.QUESTIONS_PAR_JOUR - l.erreurs}/${CONFIG.QUESTIONS_PAR_JOUR} · ${fmtMs(l.dureeMs)}`,
              badge: <><Exploits {...exploitsDuJour(day.lines.map((x) => ({ ...x, dayId: day.dayId, date: day.date })), l.userId)} /><GainGemmes n={l.points} retard={l.retard} /></> }))} />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="eyebrow">Classement de la saison{seasons.length > 1 ? ` ${saison}` : ""}</h2>
          <p className="num text-xs text-texte-3">{info.termine ? "Saison terminée" : `Fin le ${jj(info.fin)}`}</p>
        </div>
        <RankTable podium meId={userId} groupId={groupId} empty="Personne n'a encore joué cette saison."
          lines={st.classement.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang,
            badge: <GemmesCompteur n={l.points} className="text-sm text-accent-fort" /> }))} />
        <Details>Les gemmes de chaque quiz comptent aussi dans le score de la semaine du groupe, qui rapporte les trophées.</Details>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Évolution</h2>
        <ScoreChart data={history} meId={userId} maxQuestions={CONFIG.QUESTIONS_PAR_JOUR} />
      </section>

      {podiums.length > 0 && (
        <section className="card space-y-2">
          <h2 className="h2">Saisons terminées</h2>
          {podiums.map((p) => (
            <div key={p.saison} className="rounded-xl border border-or/30 bg-or-doux p-3">
              <p className="eyebrow text-or">Saison {p.saison}</p>
              {p.classement.length === 0 ? <p className="muted">Personne n&apos;a joué.</p> : p.classement.slice(0, 3).map((l) => (
                <p key={l.userId} className="flex min-h-9 items-center gap-2 font-medium"><RankBadge rang={l.rang} /> {l.pseudo} <GemmesCompteur n={l.points} className="text-sm text-accent-fort" /></p>
              ))}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
