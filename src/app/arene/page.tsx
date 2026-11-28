import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { arenaLeaderboard, arenaPool, openRooms } from "@/lib/arena/service";
import { MODES, tierOf } from "@/lib/arena/engine";
import { ARENA } from "@/config/constants";
import ArenaCreate from "./ArenaCreate";
import PlateauCreate from "./PlateauCreate";
import { openRooms as plateauxOuverts, themesDuGroupe } from "@/lib/plateau/service";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

// paliers de cote Arène : couleurs des ligues (Bronze → Diamant), jamais de violet
const TIER_COLOR: Record<string, string> = {
  Bronze: "#b0703a", Argent: "#6b7684", Or: "#8b6706", Platine: "#1f7f77", Diamant: "#2463df",
};

export default async function Arene() {
  const u = await requireUser();
  const groupes = await q<{ id: string; nom: string }>(
    "select g.id,g.nom from groups g join group_members m on m.group_id=g.id where m.user_id=$1 order by g.created_at", [u.id]);
  const rooms = [
    ...(await openRooms(groupes.map((g) => g.id))).map((r) => ({ ...r, href: `/arene/${r.code}`, titre: `${r.mode} · ${r.nrounds} manches` })),
    ...(await plateauxOuverts(groupes.map((g) => g.id))).map((r) => ({ ...r, href: `/plateau/${r.code}`, titre: "Jeu de plateau" })),
  ];
  const data = await Promise.all(groupes.map(async (g) => ({
    ...g, board: await arenaLeaderboard(g.id), dispo: (await arenaPool(g.id)).length,
    themes: (await themesDuGroupe(g.id)).themes.map((t) => t.nom),
  })));

  return (
    <main className="page">
      <section className="hero hero-energie entree">
        <div aria-hidden className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full bg-sur-energie/10" />
        <p className="eyebrow">Compétition · multijoueur en direct</p>
        <h1 className="mt-1 flex items-center gap-3 font-titre text-4xl font-extrabold lg:text-5xl"><Icon name="swords" size={34} />Arène</h1>
        <p className="mt-2 max-w-xl text-[15px] opacity-95">Des duels sur les quiz des jours passés. Le plus juste et le plus rapide gagne des points de cote.</p>
        <form action="/arene/rejoindre" className="mt-5 flex max-w-sm gap-2">
          <label htmlFor="code-arene" className="sr-only">Code de la partie</label>
          <input id="code-arene" name="code" required maxLength={ARENA.CODE_LONGUEUR} placeholder="CODE" autoComplete="off"
            className="code min-h-12 w-full rounded-[14px] border-2 border-transparent bg-surface px-3.5 text-lg tracking-[0.3em] text-texte uppercase outline-none placeholder:text-texte-3 focus:border-sur-or" />
          <button className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-[14px] bg-surface px-4 font-extrabold text-energie shadow-[0_4px_0_color-mix(in_oklab,var(--color-energie)_55%,black)] active:translate-y-[3px] active:shadow-none">
            Rejoindre<Icon name="arrowRight" size={17} />
          </button>
        </form>
      </section>

      {groupes.length === 0 && (
        <div className="card space-y-2">
          <p className="font-semibold">Pas encore de groupe</p>
          <p className="muted">L&apos;Arène se joue entre membres d&apos;un groupe, sur ses quiz passés.</p>
          <Link href="/rejoindre" className="btn-white">Rejoindre un groupe</Link>
        </div>
      )}

      {rooms.length > 0 && (
        <section className="space-y-3" aria-labelledby="t-ouvertes">
          <h2 id="t-ouvertes" className="h2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-ok" aria-hidden />Parties ouvertes
          </h2>
          <ul className="grid gap-2.5 lg:grid-cols-2">
            {rooms.map((r) => (
              <li key={r.code}>
                <Link href={r.href} className="tuile group flex items-center gap-3.5">
                  <span className="code rounded-[10px] bg-energie-doux px-2.5 py-1.5 text-lg font-semibold tracking-[0.2em] text-energie">{r.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{r.titre}</span>
                    <span className="block truncate text-sm text-texte-3">{r.hote} · {r.joueurs} joueur{Number(r.joueurs) > 1 ? "s" : ""}</span>
                  </span>
                  <Icon name="chevronRight" className="text-texte-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-7 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
        {data.map((g) => (
          <section key={g.id} className="space-y-4" aria-labelledby={`t-g-${g.id}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`t-g-${g.id}`} className="h2 min-w-0 truncate">{g.nom}</h2>
              <Link href={`/groupes/${g.id}?onglet=competitif`} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-energie hover:underline">
                <Icon name="trophy" size={15} />Ligue et trophées
              </Link>
            </div>
            <div className="card">
              <ArenaCreate groupId={g.id} modes={Object.entries(MODES).map(([id, m]) => ({ id, ...m }))} dispo={g.dispo} />
            </div>
            <div className="card space-y-2">
              <h3 className="flex items-center gap-2 font-bold">
                <span aria-hidden className="grid h-8 w-8 grid-cols-3 gap-[3px] rounded-lg bg-accent p-1.5 shadow-[0_2px_0_var(--color-accent-ombre)]">
                  {[1, 0, 1, 0, 1, 0, 1, 0, 1].map((x, i) => <span key={i} className={`rounded-full ${x ? "bg-sur-accent" : ""}`} />)}
                </span>
                Jeu de plateau
              </h3>
              <PlateauCreate groupId={g.id} themes={g.themes} />
            </div>
            <h3 className="eyebrow flex items-center gap-1.5"><Icon name="trophy" size={14} />Classement de l&apos;Arène</h3>
            {g.board.length === 0 ? (
              <p className="card muted">Personne n&apos;a encore joué. Lance la première partie !</p>
            ) : (
              <ol className="liste">
                {g.board.map((l, i) => {
                  const t = tierOf(l.rating);
                  const moi = l.user_id === u.id;
                  return (
                    <li key={l.user_id} className={`ligne ${moi ? "bg-accent-doux shadow-[inset_4px_0_0_var(--color-accent)]" : ""}`}>
                      <span className={`rang ${i < 3 ? "text-or" : ""}`}>{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{l.pseudo}{moi && <span className="ml-1.5 text-xs font-bold text-accent-fort">moi</span>}</span>
                        <span className="num block text-xs text-texte-3">
                          {l.parties} partie{l.parties > 1 ? "s" : ""} · {l.victoires} victoire{l.victoires > 1 ? "s" : ""}{l.precision != null && ` · ${l.precision} %`}
                        </span>
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: TIER_COLOR[t] ?? "#515962" }}>{t}</span>
                      <span className="num w-12 text-right font-semibold">{l.rating}</span>
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
