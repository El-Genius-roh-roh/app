import Link from "next/link";
import RankTable, { fmtMs, RankBadge } from "@/components/RankTable";
import { classementSaisonTrophees, defaultSeason, getDayRanking, getGroupTrophees, getSeasonHistory, getSeasonRanking, getSeasons, pickDay } from "@/lib/ranking";
import { q } from "@/lib/db";
import ScoreChart from "@/components/ScoreChart";
import { exploitsDuJour, ligueDe } from "@/lib/trophees";
import { DeltaTrophees, Exploits, LigueBadge } from "@/components/Trophees";
import { CONFIG } from "@/config/constants";

export default async function Classements({ subjectId, groupId, userId, today, saisonParam }: { subjectId: string; groupId: string; userId: string; today: string; saisonParam?: string }) {
  const seasons = await getSeasons(subjectId);
  if (seasons.length === 0) return null;
  const wanted = Number(saisonParam);
  const saison = seasons.some((s) => s.saison === wanted) ? wanted : defaultSeason(seasons, today);
  // trophées façon Clash Royale : la ligue dépend du total dans le groupe, le classement de saison des trophées gagnés dans cette matière
  const tr = await getGroupTrophees(groupId);
  const totalGroupe = new Map(tr.lignes.map((l) => [l.userId, l.trophees]));
  const joueurs = await getSeasonRanking(subjectId, saison);
  const joursSaison = async (n: number) => (await q<{ id: string }>("select id from game_days where subject_id=$1 and saison=$2", [subjectId, n])).map((d) => d.id);
  const season = classementSaisonTrophees(tr, await joursSaison(saison), joueurs);
  const dayId = await pickDay(subjectId, saison, today);
  const day = dayId ? await getDayRanking(dayId) : null;
  const history = await getSeasonHistory(subjectId, saison, tr.deltas);
  const finies = seasons.filter((s) => s.termine);
  const podiums = await Promise.all(finies.map(async (s) => {
    const js = await getSeasonRanking(subjectId, s.saison);
    const actifs = new Set(js.filter((l) => l.jours > 0).map((l) => l.userId));
    return { s, top: classementSaisonTrophees(tr, await joursSaison(s.saison), js).filter((l) => actifs.has(l.userId)).slice(0, 3) };
  }));

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
              badge: <><Exploits {...exploitsDuJour(day.lines.map((x) => ({ ...x, dayId: day.dayId, date: day.date })), l.userId)} /><DeltaTrophees d={tr.deltas.get(day.dayId)?.get(l.userId) ?? 0} /></> }))} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="eyebrow">Classement de la saison{seasons.length > 1 ? ` ${saison}` : ""}</h2>
        <RankTable meId={userId} groupId={groupId} lines={season.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang,
          badge: <><LigueBadge ligue={ligueDe(totalGroupe.get(l.userId) ?? 0).ligue} /><DeltaTrophees d={l.gain} /></> }))} />
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Évolution des scores</h2>
        <ScoreChart data={history} meId={userId} maxQuestions={CONFIG.QUESTIONS_PAR_JOUR} />
      </section>

      {podiums.length > 0 && (
        <section className="card space-y-2">
          <h2 className="h2">Saisons terminées</h2>
          {podiums.map(({ s, top }) => (
            <div key={s.saison} className="rounded-xl border border-or/30 bg-or/5 p-3">
              <p className="eyebrow text-or">Saison {s.saison}</p>
              {top.length === 0 ? <p className="muted">Personne n&apos;a joué.</p> : top.map((l) => (
                <p key={l.userId} className="flex min-h-9 items-center gap-2 font-medium"><RankBadge rang={l.rang} /> {l.pseudo} <DeltaTrophees d={l.gain} /></p>
              ))}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
