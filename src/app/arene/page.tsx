import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { arenaLeaderboard, arenaPool, openRooms } from "@/lib/arena/service";
import { MODES, tierOf } from "@/lib/arena/engine";
import { ARENA, MEMORY, RELIER, SOLO } from "@/config/constants";
import { addDays, realToday, sqlToday } from "@/lib/clock";
import { jeuDuJour, jeuFait } from "@/lib/jeu-du-jour";
import { sqlNbCartes } from "@/lib/notions-extraction";
import { lancerJeuDuJour } from "./actions";
import ArenaCreate from "./ArenaCreate";
import PlateauCreate from "./PlateauCreate";
import { openRooms as plateauxOuverts, themesDuGroupe } from "@/lib/plateau/service";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

// paliers de cote Arène : couleurs des ligues (Bronze → Diamant), jamais de violet
const TIER_COLOR: Record<string, string> = {
  Bronze: "#b0703a", Argent: "#6b7684", Or: "#8b6706", Platine: "#1f7f77", Diamant: "#2463df",
};

export default async function Arene({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
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

  // mini-jeu du jour (D40) : le même pour tous ; pour un jeu de matière, une matière du groupe qui a assez de notions du
  // cours (de vraies définitions), sinon celle qui a le plus de cartes
  const today = realToday();
  const jeu = jeuDuJour(today);
  const demain = jeuDuJour(addDays(today, 1));
  const minCartes = jeu.id === "memory" ? MEMORY.MIN_PAIRES : RELIER.MIN_PAIRES;
  const matieres = jeu.lieu === "matiere" ? await q<{ id: string; nom: string; group_id: string; cartes: number; notions: number }>(
    `select s.id, s.nom, s.group_id, ${sqlNbCartes("s.id", sqlToday("s.id"))} as cartes,
            (select count(*)::int from notions n where n.subject_id=s.id) as notions
       from subjects s where s.group_id = any($1::uuid[])`,
    [groupes.map((g) => g.id)]) : [];
  const [{ n: sessions }] = await q<{ n: number }>(
    "select count(*)::int as n from solo_sessions where user_id=$1 and type=$2 and (created_at at time zone 'Europe/Paris')::date = $3::date",
    [u.id, jeu.solo, today]);
  const moi = JSON.stringify([{ id: u.id }]);
  const [{ multi }] = jeu.lieu === "arene" ? await q<{ multi: number }>(
    "select count(*)::int as multi from arena_rooms where phase='final' and updated_at >= $2::date and state->'players' @> $1::jsonb", [moi, today]) : [{ multi: 0 }];
  const fait = jeuFait(jeu, { [jeu.solo]: sessions }, multi);
  const jeuParGroupe = data.map((g) => ({
    ...g,
    matiere: [...matieres].filter((m) => m.group_id === g.id && m.cartes >= minCartes).sort((a, b) => Number(b.notions >= minCartes) - Number(a.notions >= minCartes) || b.cartes - a.cartes)[0] ?? null,
  }));
  const dateLongue = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${today}T12:00:00Z`));

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

      {groupes.length > 0 && (
        <section id="jeu-du-jour" className="card scroll-mt-24 space-y-4" aria-labelledby="t-jdj">
          <div className="flex items-start gap-3.5">
            <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-energie text-sur-energie shadow-[0_3px_0_color-mix(in_oklab,var(--color-energie)_55%,black)]">
              <Icon name={jeu.icone} size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="eyebrow first-letter:uppercase">Mini-jeu du jour · {dateLongue}</p>
              <h2 id="t-jdj" className="h2">{jeu.titre}</h2>
            </div>
            {fait && <span className="chip shrink-0 border-ok/40 bg-ok-doux text-ok"><Icon name="check" size={14} />Fait</span>}
          </div>
          <p className="text-[15px] text-texte-2">{jeu.desc}</p>
          {erreur && <p className="text-sm font-semibold text-ko" role="alert">{erreur}</p>}
          <ul className="grid gap-2 sm:grid-cols-2">
            {jeuParGroupe.map((g) => (
              <li key={g.id}>
                {jeu.lieu === "matiere" ? (
                  g.matiere ? (
                    <Link href={`/matieres/${g.matiere.id}/${jeu.id}`} className="btn-orange">
                      <Icon name="play" size={17} /><span className="truncate">{fait ? "Rejouer" : "Jouer"} · {g.matiere.nom}</span>
                    </Link>
                  ) : <p className="rounded-[14px] border-2 border-dashed border-ligne p-3 text-sm text-texte-3">{g.nom} : pas encore assez de notions ni de questions passées pour ce jeu.</p>
                ) : g.dispo >= ARENA.MIN_QUESTIONS ? (
                  <form action={lancerJeuDuJour}>
                    <input type="hidden" name="groupe" value={g.id} />
                    <button className="btn-orange"><Icon name="play" size={17} /><span className="truncate">{fait ? "Rejouer" : "Jouer"}{groupes.length > 1 ? ` · ${g.nom}` : " contre des bots"}</span></button>
                  </form>
                ) : <p className="rounded-[14px] border-2 border-dashed border-ligne p-3 text-sm text-texte-3">{g.nom} : pas encore assez de questions des jours passés.</p>}
              </li>
            ))}
          </ul>
          <p className="text-sm text-texte-3">
            {jeu.lieu === "arene" && "Tes amis peuvent te rejoindre avec le code avant le lancement. "}
            Un nouveau jeu chaque jour, <span className="num">+{SOLO.GEMMES_PAR_SESSION}</span> gemmes pour ta semaine. Demain : <b className="text-texte-2">{demain.titre}</b>.
          </p>
        </section>
      )}

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

      {groupes.length > 0 && (
        <div className="space-y-1">
          <h2 className="h2">Arène libre</h2>
          <p className="muted">Des parties quand tu veux, contre tes amis ou contre des bots, sur les quiz des jours passés.</p>
        </div>
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
