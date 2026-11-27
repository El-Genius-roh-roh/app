import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { arenaLeaderboard, arenaPool, openRooms } from "@/lib/arena/service";
import { MODES, tierOf } from "@/lib/arena/engine";
import { ARENA } from "@/config/constants";
import ArenaCreate from "./ArenaCreate";

export const dynamic = "force-dynamic";

const TIER_COLOR: Record<string, string> = {
  Bronze: "bg-amber-700", Argent: "bg-slate-400", Or: "bg-yellow-500", Platine: "bg-cyan-500", Diamant: "bg-fuchsia-500",
};

export default async function Arene() {
  const u = await requireUser();
  const groupes = await q<{ id: string; nom: string }>(
    "select g.id,g.nom from groups g join group_members m on m.group_id=g.id where m.user_id=$1 order by g.created_at", [u.id]);
  const rooms = await openRooms(groupes.map((g) => g.id));
  const data = await Promise.all(groupes.map(async (g) => ({
    ...g, board: await arenaLeaderboard(g.id), dispo: (await arenaPool(g.id)).length,
  })));

  return (
    <main className="mx-auto max-w-md p-4 space-y-5">
      <Link href="/" className="text-sm text-indigo-600">← Accueil</Link>
      <header className="rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-5 text-white shadow">
        <h1 className="text-2xl font-extrabold">⚔️ Arène</h1>
        <p className="text-sm opacity-90">Duels en direct sur les quiz des jours passés. Le plus rapide et le plus juste gagne des points de ligue.</p>
      </header>

      {groupes.length === 0 && <p className="text-gray-500">Rejoins d&apos;abord un groupe pour jouer en Arène.</p>}

      {rooms.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Parties ouvertes</h2>
          {rooms.map((r) => (
            <Link key={r.code} href={`/arene/${r.code}`} className="flex items-center justify-between rounded-xl border-2 border-indigo-200 p-3 hover:bg-indigo-50">
              <span><b className="tracking-widest">{r.code}</b> · {r.mode} · {r.nrounds} manches</span>
              <span className="text-xs text-gray-500">{r.hote} · {r.joueurs} joueur(s)</span>
            </Link>
          ))}
        </section>
      )}

      <section className="space-y-2 rounded-xl border p-3">
        <h2 className="font-semibold">Rejoindre avec un code</h2>
        <form action="/arene/rejoindre" className="flex gap-2">
          <input name="code" required maxLength={ARENA.CODE_LONGUEUR} placeholder="ABCD" className="w-full rounded border p-2 uppercase tracking-widest" />
          <button className="rounded bg-indigo-600 px-4 text-white">Go</button>
        </form>
      </section>

      {data.map((g) => (
        <section key={g.id} className="space-y-3 rounded-xl border p-3">
          <h2 className="font-semibold">{g.nom}</h2>
          <ArenaCreate groupId={g.id} modes={Object.entries(MODES).map(([id, m]) => ({ id, ...m }))} dispo={g.dispo} />
          <h3 className="text-sm font-semibold">🏆 Classement de l&apos;Arène</h3>
          {g.board.length === 0 ? <p className="text-sm text-gray-500">Personne n&apos;a encore joué. Sois le premier !</p> : (
            <ol className="divide-y rounded border text-sm">
              {g.board.map((l, i) => {
                const t = tierOf(l.rating);
                return (
                  <li key={l.user_id} className={`flex items-center gap-2 p-2 ${l.user_id === u.id ? "bg-indigo-50 font-semibold" : ""}`}>
                    <span className="w-6 text-center">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                    <span className="flex-1 truncate">{l.pseudo}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${TIER_COLOR[t]}`}>{t}</span>
                    <span className="text-xs font-normal text-gray-500">{l.parties} p · {l.victoires} 🏅{l.precision != null && ` · ${l.precision}%`}</span>
                    <span className="w-12 text-right">{l.rating}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ))}
    </main>
  );
}
