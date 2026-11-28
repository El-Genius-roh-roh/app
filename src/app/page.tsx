import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { sqlToday } from "@/lib/clock";
import { CONFIG, FLASHCARDS, MEMORY, RELIER } from "@/config/constants";
import { facteurRetard } from "@/lib/scoring";
import Icon from "@/components/Icon";
import { FORMATS, formatDuJour, resultatTexte, type Format } from "@/lib/quiz/formats";
import { LigueCard } from "@/components/Trophees";
import AutoRefresh from "@/components/AutoRefresh";
import Details from "@/components/Details";
import { Defis, MesSucces, MonClassement } from "@/components/Tableau";
import { tableauDeBord } from "@/lib/tableau";
import { sqlNbCartes } from "@/lib/notions-extraction";

type Jour = { day_id: string; subject_id: string; matiere: string; groupe: string; jour: number; date: string; format: Format | null; statut: string | null; erreurs: number | null; rang: number | null };

type Onglet = "jour" | "ligue" | "solo";
const ONGLETS: [Onglet, string, "target" | "trophy" | "cards"][] = [["jour", "Aujourd'hui", "target"], ["ligue", "Ligue et succès", "trophy"], ["solo", "Solo et flashcards", "cards"]];

/** Sous-titre du jeu du jour d'une matière (D46). */
const sousTitre = (f: Format) => f === "memory" ? "retrouve les paires" : f === "mort_subite" ? "jusqu'à la première erreur" : `${CONFIG.QUESTIONS_PAR_JOUR} questions`;

export default async function Accueil({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const o = (await searchParams).onglet;
  const onglet: Onglet = o === "ligue" || o === "solo" ? o : "jour";
  const u = await requireUser();
  const groupes = await q<{ id: string; nom: string; membres: number; matieres: number }>(
    `select g.id, g.nom,
            (select count(*)::int from group_members x where x.group_id=g.id) as membres,
            (select count(*)::int from subjects s where s.group_id=g.id) as matieres
       from groups g join group_members m on m.group_id=g.id where m.user_id=$1 order by g.created_at`, [u.id]);
  // le défi du jour (D41) de chaque matière de mes groupes, avec mon état (à jouer / en cours / fait)
  const jours = await q<Jour>(
    `select gd.id as day_id, s.id as subject_id, s.nom as matiere, g.nom as groupe, gd.jour_dans_saison as jour,
            to_char(gd.date,'YYYY-MM-DD') as date, a.format, a.statut, a.erreurs, r.rang
       from subjects s join groups g on g.id=s.group_id join group_members m on m.group_id=g.id and m.user_id=$1
       join game_days gd on gd.subject_id=s.id and gd.date = ${sqlToday("s.id")}
       left join attempts a on a.game_day_id=gd.id and a.user_id=$1
       left join daily_results r on r.game_day_id=gd.id and r.user_id=$1
      order by (a.statut is not null and a.statut <> 'en_cours'), g.created_at, s.created_at`, [u.id]);
  const fait = (j: Jour) => !!j.statut && j.statut !== "en_cours";
  const restants = jours.filter((j) => !fait(j));
  const prochain = restants[0];
  const N = CONFIG.QUESTIONS_PAR_JOUR;
  const fmtJ = (j: Jour) => j.format ?? formatDuJour(j.date);
  // quiz manqués encore rattrapables (gemmes réduites de 10 % par jour de retard)
  const rattrapages = await q<{ day_id: string; matiere: string; jour: number; retard: number; statut: string | null }>(
    `select gd.id as day_id, s.nom as matiere, gd.jour_dans_saison as jour, (${sqlToday("s.id")} - gd.date)::int as retard, a.statut
       from subjects s join groups g on g.id=s.group_id join group_members m on m.group_id=g.id and m.user_id=$1
       join game_days gd on gd.subject_id=s.id and gd.date < ${sqlToday("s.id")} and gd.date >= ${sqlToday("s.id")} - $2::int
       left join attempts a on a.game_day_id=gd.id and a.user_id=$1
      where a.statut is null or a.statut = 'en_cours'
      order by gd.date, g.created_at, s.created_at`, [u.id, CONFIG.RATTRAPAGE_JOURS]);
  // jeux solo : cartes disponibles par matière (questions vérifiées des jours passés, comme les flashcards et le Memory)
  const matieres = await q<{ id: string; nom: string; groupe: string; cartes: number; notions: number }>(
    `select s.id, s.nom, g.nom as groupe,
            ${sqlNbCartes("s.id", sqlToday("s.id"))} as cartes, (select count(*)::int from notions n where n.subject_id=s.id) as notions
       from subjects s join groups g on g.id=s.group_id join group_members m on m.group_id=g.id and m.user_id=$1
      order by g.created_at, s.created_at`, [u.id]);
  // tableau de bord personnel (D38) : défis du jour, mon classement, mes succès
  // matière conseillée : de vraies notions du cours d'abord (assez pour Relier et le Memory), puis le plus de cartes
  const conseillee = [...matieres].filter((m) => m.cartes >= FLASHCARDS.MIN)
    .sort((a, b) => Number(b.notions >= RELIER.MIN_PAIRES) - Number(a.notions >= RELIER.MIN_PAIRES) || b.cartes - a.cartes)[0]?.id ?? null;
  const tb = await tableauDeBord(u.id, { faits: jours.length - restants.length, total: jours.length, href: prochain ? `/quiz/${prochain.day_id}` : "/" }, conseillee);

  return (
    <main className="page">
      <AutoRefresh every={30000} />
      <header className="entree">
        <p className="eyebrow">Réviser · salut {u.pseudo}</p>
        <h1 className="title mt-1">
          {jours.length === 0 ? "Prêt à réviser ?" : restants.length === 0 ? "Tout est joué. Bravo !" : restants.length === 1 ? "Un jeu du jour t'attend" : `${restants.length} jeux du jour t'attendent`}
        </h1>
      </header>

      <nav className="grid max-w-xl grid-cols-3 gap-1 rounded-[14px] bg-surface-2 p-1" aria-label="Onglets de l'accueil">
        {ONGLETS.map(([k, titre, ic]) => (
          <Link key={k} href={k === "jour" ? "/" : `/?onglet=${k}`} scroll={false} aria-current={onglet === k ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-[11px] px-1 text-center text-[13px] leading-tight font-bold transition-colors sm:text-sm ${onglet === k ? "bg-surface text-accent-fort shadow-[0_2px_0_var(--color-ligne)]" : "text-texte-2 hover:text-texte"}`}>
            <Icon name={ic} size={16} className="shrink-0 max-sm:hidden" />{titre}
          </Link>
        ))}
      </nav>

      {onglet === "ligue" && (
        <div className="space-y-7 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10 lg:space-y-0">
          <div className="space-y-7">
            <LigueCard trophees={tb.ligue.total} enJeu={tb.ligue.enJeu} />
            <MonClassement classements={tb.classements} />
          </div>
          <MesSucces succes={tb.succes} />
        </div>
      )}

      {onglet === "solo" && <Solo matieres={matieres} />}

      {onglet === "jour" && (

      <div className="space-y-7 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-10 lg:space-y-0">
        <div className="space-y-7">
          <section className="space-y-3" aria-labelledby="t-groupes">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="t-groupes" className="h2">Mes groupes</h2>
              <span className="flex shrink-0 items-center gap-1 text-sm font-bold">
                <Link href="/groupes/nouveau" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-accent-fort hover:bg-accent-doux"><Icon name="plus" size={16} />Créer</Link>
                <Link href="/rejoindre" className="inline-flex min-h-11 items-center rounded-lg px-2 text-texte-2 hover:bg-surface-2">Rejoindre</Link>
              </span>
            </div>
            {groupes.length === 0 && (
              <div className="card space-y-1">
                <p className="font-semibold">Pas encore de groupe</p>
                <p className="muted">Crée le tien, ou rejoins celui de tes amis avec leur code d&apos;invitation.</p>
              </div>
            )}
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {groupes.map((g) => (
                <li key={g.id}>
                  <Link href={`/groupes/${g.id}`} className="tuile group flex items-center gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-surface-2 font-titre text-lg font-extrabold text-texte-2" aria-hidden>
                      {g.nom.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{g.nom}</span>
                      <span className="num block text-xs text-texte-3">{g.membres} membre{g.membres > 1 ? "s" : ""} · {g.matieres} matière{g.matieres > 1 ? "s" : ""}</span>
                    </span>
                    <Icon name="chevronRight" className="text-texte-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <h2 className="h2">À faire dans tes matières</h2>
          {/* le moment fort : le prochain quiz à jouer */}
          {prochain && (
            <section className="hero entree" aria-labelledby="t-prochain">
              <div aria-hidden className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-sur-accent/10" />
              <div aria-hidden className="pointer-events-none absolute top-5 right-5 h-5 w-5 rounded-full bg-or-vif" />
              <p className="text-[13px] font-semibold opacity-85">Jeu du jour · {prochain.groupe}</p>
              <h2 id="t-prochain" className="mt-2 max-w-[85%] font-titre text-4xl leading-[1.02] font-extrabold break-words lg:text-5xl">{prochain.matiere}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm opacity-90"><Icon name={FORMATS[fmtJ(prochain)].icone} size={16} /><b>{FORMATS[fmtJ(prochain)].titre}</b> · {sousTitre(fmtJ(prochain))} · un seul essai</p>
              <Link href={`/quiz/${prochain.day_id}`}
                className="btn-hero mt-6">
                <Icon name="play" size={20} />{prochain.statut === "en_cours" ? "Reprendre le jeu" : "Jouer maintenant"}
              </Link>
            </section>
          )}


          <section className="space-y-3" aria-labelledby="t-jour">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="t-jour" className="h2">Aujourd&apos;hui</h2>
              {jours.length > 0 && <span className="num text-sm text-texte-3">{jours.length - restants.length}/{jours.length} joués</span>}
            </div>
            {jours.length > 0 && (
              <div className="flex gap-1.5" aria-hidden>
                {jours.map((j) => <span key={j.day_id} className={`h-2 flex-1 rounded-full ${fait(j) ? "bg-ok" : "bg-ligne"}`} />)}
              </div>
            )}
            {jours.length === 0 ? (
              <div className="card space-y-1">
                <p className="font-semibold">Aucun jeu du jour prévu aujourd&apos;hui</p>
                <p className="muted">Ajoute une matière dans un de tes groupes : son premier quiz arrive le lendemain.</p>
              </div>
            ) : jours.length > 1 && (
              <ul className="liste">
                {jours.filter((j) => j !== prochain).map((j) => {
                  const ok = fait(j);
                  return (
                    <li key={j.day_id}>
                      <Link href={ok ? `/matieres/${j.subject_id}` : `/quiz/${j.day_id}`} className="ligne group min-h-16 transition-colors hover:bg-surface-2">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${ok ? "bg-ok-doux text-ok" : "bg-accent-doux text-accent-fort"}`}>
                          <Icon name={ok ? "check" : "play"} size={19} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{j.matiere}</span>
                          <span className="block truncate text-sm text-texte-3">{j.groupe} · {FORMATS[fmtJ(j)].titre}</span>
                        </span>
                        {ok ? (
                          <span className="text-right">
                            <span className="num block text-lg font-semibold">{resultatTexte(fmtJ(j), j.erreurs ?? 0, N)}</span>
                            {j.rang && <span className="num block text-xs font-medium text-or">{j.rang === 1 ? "1er" : `${j.rang}e`} du jour</span>}
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-accent-fort">{j.statut === "en_cours" ? "Reprendre" : "Jouer"}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {rattrapages.length > 0 && (
            <section className="space-y-3" aria-labelledby="t-rattrapage">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="t-rattrapage" className="h2">À rattraper</h2>
                <span className="text-sm text-texte-3">encore {CONFIG.RATTRAPAGE_JOURS} jours max.</span>
              </div>
              <ul className="liste">
                {rattrapages.map((r) => (
                  <li key={r.day_id}>
                    <Link href={`/quiz/${r.day_id}`} className="ligne group min-h-16 transition-colors hover:bg-surface-2">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-or-doux text-or"><Icon name="calendar" size={19} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{r.matiere}</span>
                        <span className="block truncate text-sm text-texte-3">Jour {r.jour} · {Math.round(facteurRetard(r.retard) * 100)}&nbsp;% des gemmes</span>
                      </span>
                      <span className="text-sm font-bold text-accent-fort">{r.statut === "en_cours" ? "Reprendre" : "Jouer"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </div>

        <aside className="space-y-7">
          <Defis defis={tb.defis} />
        </aside>
      </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ onglet « Solo et flashcards » */

/** Révisions solo, sans chrono ni classement : flashcards, Memory et Relier, sur les notions du cours et les questions des jours passés. */
function Solo({ matieres }: { matieres: { id: string; nom: string; groupe: string; cartes: number; notions: number }[] }) {
  const bouton = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] px-2 text-sm font-bold transition-transform hover:-translate-y-px active:translate-y-px";
  return (
    <section className="space-y-3" aria-labelledby="t-solo">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="t-solo" className="h2">Flashcards et jeux solo</h2>
        <Details>Sans chrono ni classement, à ton rythme : les notions du cours et les questions des jeux du jour déjà passés.</Details>
      </div>
      {matieres.length === 0 && (
        <div className="card space-y-1">
          <p className="font-semibold">Pas encore de matière</p>
          <p className="muted">Rejoins un groupe ou crée une matière : ses flashcards et ses jeux arrivent dès que le cours est importé.</p>
        </div>
      )}
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {matieres.map((m) => {
          const flash = m.cartes >= FLASHCARDS.MIN;
          const memory = m.notions >= MEMORY.MIN_PAIRES || m.cartes >= MEMORY.MIN_PAIRES;
          const relier = m.notions >= RELIER.MIN_PAIRES || m.cartes >= RELIER.MIN_PAIRES;
          return (
            <li key={m.id} className="card space-y-3 p-3.5 lg:p-4">
              <Link href={`/matieres/${m.id}`} className="group flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold group-hover:text-accent-fort">{m.nom}</span>
                  <span className="block truncate text-xs text-texte-3">{m.groupe} · <span className="num">{m.cartes}</span> carte{m.cartes > 1 ? "s" : ""} · <span className="num">{m.notions}</span> notion{m.notions > 1 ? "s" : ""}</span>
                </span>
                <Icon name="chevronRight" size={18} className="text-texte-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {flash || memory || relier ? (
                <div className="grid grid-cols-3 gap-2">
                  {flash && <Link href={`/matieres/${m.id}/flashcards`} className={`${bouton} bg-accent-doux text-accent-fort`}><Icon name="cards" size={16} />Cartes</Link>}
                  {memory && <Link href={`/matieres/${m.id}/memory`} className={`${bouton} bg-or-doux text-or`}><Icon name="target" size={16} />Memory</Link>}
                  {relier && <Link href={`/matieres/${m.id}/relier`} className={`${bouton} bg-ok-doux text-ok`}><Icon name="share" size={16} />Relier</Link>}
                </div>
              ) : (
                <Details label="Bientôt disponible">Disponible dès qu&apos;un cours est importé ou après les premiers jeux du jour.</Details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
