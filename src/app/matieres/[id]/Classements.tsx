import Link from "next/link";
import RankTable, { fmtMs, RankBadge } from "@/components/RankTable";
import { defaultSeason, getDayRanking, getSeasonRanking, getSeasons, pickDay } from "@/lib/ranking";

export default async function Classements({ subjectId, userId, today, saisonParam }: { subjectId: string; userId: string; today: string; saisonParam?: string }) {
  const seasons = await getSeasons(subjectId);
  if (seasons.length === 0) return null;
  const wanted = Number(saisonParam);
  const saison = seasons.some((s) => s.saison === wanted) ? wanted : defaultSeason(seasons, today);
  const info = seasons.find((s) => s.saison === saison)!;
  const season = await getSeasonRanking(subjectId, saison);
  const dayId = await pickDay(subjectId, saison, today);
  const day = dayId ? await getDayRanking(dayId) : null;
  const finies = seasons.filter((s) => s.termine);
  const podiums = await Promise.all(finies.map(async (s) => ({ s, top: (await getSeasonRanking(subjectId, s.saison)).filter((l) => l.jours > 0).slice(0, 3) })));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Classements</h2>
        {seasons.length > 1 && (
          <div className="flex gap-1 text-xs">
            {seasons.map((s) => (
              <Link key={s.saison} href={`?saison=${s.saison}`} scroll={false}
                className={`rounded border px-2 py-1 ${s.saison === saison ? "bg-indigo-600 text-white" : ""}`}>Saison {s.saison}</Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-indigo-700">
          Classement du jour {day && <span className="font-normal text-gray-500">· jour {day.jour} ({day.date}) · {day.fige ? "définitif" : "provisoire"}</span>}
        </h3>
        {day ? (
          <>
            <RankTable meId={userId} empty="Personne n'a encore joué ce jour-là."
              lines={day.lines.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang, points: l.points, detail: `${l.erreurs} err. · ${fmtMs(l.dureeMs)} · ${l.battus} battu${l.battus > 1 ? "s" : ""}` }))} />
            {day.absents.length > 0 && <p className="text-xs text-gray-500">N&apos;ont pas encore joué : {day.absents.join(", ")}</p>}
          </>
        ) : <p className="text-sm text-gray-500">La saison n&apos;a pas encore commencé ({info.debut}).</p>}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-indigo-700">
          Classement de la saison {saison} <span className="font-normal text-gray-500">· {info.debut} → {info.fin}{info.termine ? " · terminée" : ""}</span>
        </h3>
        <RankTable meId={userId}
          lines={season.map((l) => ({ userId: l.userId, pseudo: l.pseudo, rang: l.rang, points: l.points, detail: `${l.jours} j · ${l.erreurs} err.` }))} />
        <p className="text-xs text-gray-500">Égalité : moins d&apos;erreurs sur la saison, puis temps total.</p>
      </div>

      {podiums.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-indigo-700">Saisons terminées</h3>
          {podiums.map(({ s, top }) => (
            <div key={s.saison} className="rounded border p-2 text-sm">
              <div className="text-xs text-gray-500">Saison {s.saison} · {s.debut} → {s.fin}</div>
              {top.length === 0 ? <p className="text-xs text-gray-500">Personne n&apos;a joué.</p> : top.map((l) => (
                <div key={l.userId}><RankBadge rang={l.rang} /> {l.pseudo} <span className="text-xs text-gray-500">{l.points} pts</span></div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
