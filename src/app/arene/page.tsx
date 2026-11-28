import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { arenaLeaderboard, arenaPool, openRooms } from "@/lib/arena/service";
import { MODES, tierOf } from "@/lib/arena/engine";
import { ARENA } from "@/config/constants";
import ArenaCreate from "./ArenaCreate";

export const dynamic = "force-dynamic";

const TIER_COLOR: Record<string, string> = {
  Bronze: "bg-amber-700", Argent: "bg-slate-400", Or: "bg-yellow-500", Platine: "bg-cyan-500", Diamant: "bg-accent-500",
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
    <main className="page">
      <Link href="/" className="back">Accueil</Link>
      <header className="hero">
        <h1 className="title">Arène</h1>
        <p className="mt-1 text-sm text-white/90">Duels en direct sur les quiz des jours passés. Le plus rapide et le plus juste gagne des points de ligue.</p>
      </header>

      {groupes.length === 0 && <p className="muted">Rejoins d&apos;abord un groupe pour jouer en Arène.</p>}

      {rooms.length > 0 && (
        <section className="space-y-2">
          <h2 className="h2">Parties ouvertes</h2>
          {rooms.map((r) => (
            <Link key={r.code} href={`/arene/${r.code}`} className="card-lien flex items-center justify-between lg:max-w-2xl">
              <span><b className="tracking-widest">{r.code}</b> · {r.mode} · {r.nrounds} manches</span>
              <span className="muted">{r.hote} · {r.joueurs} joueur(s)</span>
            </Link>
          ))}
        </section>
      )}

      <section className="card space-y-2 lg:max-w-md">
        <h2 className="h2">Rejoindre avec un code</h2>
        <form action="/arene/rejoindre" className="flex gap-2">
          <input name="code" required maxLength={ARENA.CODE_LONGUEUR} placeholder="ABCD" className="input uppercase tracking-widest" />
          <button className="btn-primary w-auto shrink-0 px-5">Go</button>
        </form>
      </section>

      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
      {data.map((g) => (
        <section key={g.id} className="card space-y-3">
          <h2 className="h2">{g.nom}</h2>
          <ArenaCreate groupId={g.id} modes={Object.entries(MODES).map(([id, m]) => ({ id, ...m }))} dispo={g.dispo} />
          <h3 className="text-sm font-semibold">Classement de l&apos;Arène</h3>
          {g.board.length === 0 ? <p className="muted">Personne n&apos;a encore joué. Sois le premier !</p> : (
            <ol className="divide-y divide-black/5 rounded-2xl bg-slate-50 text-sm">
              {g.board.map((l, i) => {
                const t = tierOf(l.rating);
                return (
                  <li key={l.user_id} className={`flex items-center gap-2 p-2.5 first:rounded-t-2xl last:rounded-b-2xl ${l.user_id === u.id ? "bg-accent-50 font-semibold" : ""}`}>
                    <span className="w-6 text-center">{i + 1}</span>
                    <span className="flex-1 truncate">{l.pseudo}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${TIER_COLOR[t]}`}>{t}</span>
                    <span className="text-xs font-normal text-slate-500">{l.parties} p · {l.victoires}{l.precision != null && ` · ${l.precision}%`}</span>
                    <span className="w-12 text-right font-mono">{l.rating}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ))}
      </div>
    </main>
  );
}
