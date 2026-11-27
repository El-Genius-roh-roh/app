import Link from "next/link";
import RankTable, { fmtMs, RankBadge } from "@/components/RankTable";
import { defaultSeason, getDayRanking, getSeasonRanking, getSeasons, pickDay } from "@/lib/ranking";
import { CONFIG } from "@/config/constants";

export default async function Classements({ subjectId, userId, today, saisonParam }: { subjectId: string; userId: string; today: string; saisonParam?: string }) {
  const seasons = await getSeasons(subjectId);
  if (seasons.length === 0) return null;
  const wanted = Number(saisonParam);
  const saison = seasons.some((s) => s.saison === wanted) ? wanted : defaultSeason(seasons, today);
  const season = await getSeasonRanking(subjectId, saison);
  const dayId = await pickDay(subjectId, saison, today);
  const day = dayId ? await getDayRanking(dayId) : null;
  const finies = seasons.filter((s) => s.termine);
  const podiums = await Promise.all(finies.map(async (s) => ({ s, top: (await getSeasonRanking(subjectId, s.saison)).filter((l) => l.jours > 0).slice(0, 3) })));

  return (
    <>
      {seasons.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {seasons.map((s) => (
            <Link key={s.saison} href={`?saison=${s.saison}`} scroll={false}
              className={`chip ${s.saison === saison ? "bg-violet-600 text-white" : "bg-white text-violet-700"}`}>Saison {s.saison}</Link>
          ))}
        </div>
      )}

      {day && (
        <section className="card space-y-3">
          <h2 className="h2">⚡ Classement du jour {day.date !== today && <span className="text-sm font-semibold text-slate-500">(jour {day.jour})</span>}</h2>
          <RankTable meId={userId} empty="Personne n'a encore joué."
            lines={day.lines.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang, points: l.points, detail: `${CONFIG.QUESTIONS_PAR_JOUR - l.erreurs}/${CONFIG.QUESTIONS_PAR_JOUR} · ${fmtMs(l.dureeMs)}` }))} />
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="h2">🏆 Classement de la saison{seasons.length > 1 ? ` ${saison}` : ""}</h2>
        <RankTable meId={userId} lines={season.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang, points: l.points }))} />
      </section>

      {podiums.length > 0 && (
        <section className="card space-y-2">
          <h2 className="h2">Saisons terminées</h2>
          {podiums.map(({ s, top }) => (
            <div key={s.saison} className="rounded-2xl bg-amber-50 p-3">
              <p className="text-sm font-extrabold text-orange-600">Saison {s.saison}</p>
              {top.length === 0 ? <p className="muted">Personne n&apos;a joué.</p> : top.map((l) => (
                <p key={l.userId} className="font-semibold"><RankBadge rang={l.rang} /> {l.pseudo} · {l.points} pts</p>
              ))}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
