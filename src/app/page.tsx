import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { sqlToday } from "@/lib/clock";
import { CONFIG, FLASHCARDS, SOLO } from "@/config/constants";
import { facteurRetard } from "@/lib/scoring";
import Icon from "@/components/Icon";
import AutoRefresh from "@/components/AutoRefresh";
import { Defis, MesSucces, MonClassement } from "@/components/Tableau";
import { tableauDeBord } from "@/lib/tableau";
import { sqlNbCartes } from "@/lib/notions-extraction";

type Jour = { day_id: string; subject_id: string; matiere: string; groupe: string; jour: number; statut: string | null; erreurs: number | null; rang: number | null };

export default async function Accueil() {
  const u = await requireUser();
  const groupes = await q<{ id: string; nom: string; membres: number; matieres: number }>(
    `select g.id, g.nom,
            (select count(*)::int from group_members x where x.group_id=g.id) as membres,
            (select count(*)::int from subjects s where s.group_id=g.id) as matieres
       from groups g join group_members m on m.group_id=g.id where m.user_id=$1 order by g.created_at`, [u.id]);
  // le quiz du jour de chaque matière de mes groupes, avec mon état (à jouer / en cours / fait)
  const jours = await q<Jour>(
    `select gd.id as day_id, s.id as subject_id, s.nom as matiere, g.nom as groupe, gd.jour_dans_saison as jour,
            a.statut, a.erreurs, r.rang
       from subjects s join groups g on g.id=s.group_id join group_members m on m.group_id=g.id and m.user_id=$1
       join game_days gd on gd.subject_id=s.id and gd.date = ${sqlToday("s.id")}
       left join attempts a on a.game_day_id=gd.id and a.user_id=$1
       left join daily_results r on r.game_day_id=gd.id and r.user_id=$1
      order by (a.statut is not null and a.statut <> 'en_cours'), g.created_at, s.created_at`, [u.id]);
  const fait = (j: Jour) => !!j.statut && j.statut !== "en_cours";
  const restants = jours.filter((j) => !fait(j));
  const prochain = restants[0];
  const N = CONFIG.QUESTIONS_PAR_JOUR;
  // quiz manqués encore rattrapables (gemmes réduites de 10 % par jour de retard)
  const rattrapages = await q<{ day_id: string; matiere: string; jour: number; retard: number; statut: string | null }>(
    `select gd.id as day_id, s.nom as matiere, gd.jour_dans_saison as jour, (${sqlToday("s.id")} - gd.date)::int as retard, a.statut
       from subjects s join groups g on g.id=s.group_id join group_members m on m.group_id=g.id and m.user_id=$1
       join game_days gd on gd.subject_id=s.id and gd.date < ${sqlToday("s.id")} and gd.date >= ${sqlToday("s.id")} - $2::int
       left join attempts a on a.game_day_id=gd.id and a.user_id=$1
      where a.statut is null or a.statut = 'en_cours'
      order by gd.date, g.created_at, s.created_at`, [u.id, CONFIG.RATTRAPAGE_JOURS]);
  // jeux solo : cartes disponibles par matière (questions vérifiées des jours passés, comme les flashcards et le Memory)
  const matieres = await q<{ id: string; nom: string; groupe: string; cartes: number }>(
    `select s.id, s.nom, g.nom as groupe,
            ${sqlNbCartes("s.id", sqlToday("s.id"))} as cartes
       from subjects s join groups g on g.id=s.group_id join group_members m on m.group_id=g.id and m.user_id=$1
      order by g.created_at, s.created_at`, [u.id]);
  // tableau de bord personnel (D38) : défis du jour, mon classement, mes succès
  const conseillee = [...matieres].filter((m) => m.cartes >= FLASHCARDS.MIN).sort((a, b) => b.cartes - a.cartes)[0]?.id ?? null;
  const tb = await tableauDeBord(u.id, { faits: jours.length - restants.length, total: jours.length, href: prochain ? `/quiz/${prochain.day_id}` : "/" }, conseillee);

  return (
    <main className="page">
      <AutoRefresh every={30000} />
      <header className="entree">
        <p className="eyebrow">Réviser · salut {u.pseudo}</p>
        <h1 className="title mt-1">
          {jours.length === 0 ? "Prêt à réviser ?" : restants.length === 0 ? "Tout est joué. Bravo !" : restants.length === 1 ? "Un quiz t'attend" : `${restants.length} quiz t'attendent`}
        </h1>
      </header>

      <div className="space-y-7 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-10 lg:space-y-0">
        <div className="space-y-7">
          {/* le moment fort : le prochain quiz à jouer */}
          {prochain && (
            <section className="hero entree" aria-labelledby="t-prochain">
              <div aria-hidden className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-sur-accent/10" />
              <div aria-hidden className="pointer-events-none absolute top-5 right-5 h-5 w-5 rounded-full bg-or-vif" />
              <p className="font-num text-xs font-medium tracking-[0.08em] uppercase opacity-85">Quiz du jour · {prochain.groupe}</p>
              <h2 id="t-prochain" className="mt-2 max-w-[85%] font-titre text-4xl leading-[1.02] font-extrabold break-words lg:text-5xl">{prochain.matiere}</h2>
              <p className="mt-2 text-sm opacity-90"><span className="num">{N}</span> questions · jour <span className="num">{prochain.jour}</span> · un seul essai</p>
              <Link href={`/quiz/${prochain.day_id}`}
                className="btn-hero mt-6">
                <Icon name="play" size={20} />{prochain.statut === "en_cours" ? "Reprendre le quiz" : "Jouer maintenant"}
              </Link>
            </section>
          )}

          <Defis defis={tb.defis} />
          <MonClassement classements={tb.classements} />

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
                <p className="font-semibold">Aucun quiz prévu aujourd&apos;hui</p>
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
                          <span className="block truncate text-sm text-texte-3">{j.groupe} · jour {j.jour}</span>
                        </span>
                        {ok ? (
                          <span className="text-right">
                            <span className="num block text-lg font-semibold">{N - (j.erreurs ?? 0)}<span className="text-texte-3">/{N}</span></span>
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
          <MesSucces succes={tb.succes} />

          {/* sans chrono : on apprend à son rythme ; chaque session compte pour le score de la semaine (D37) */}
          {matieres.length > 0 && (
            <section className="space-y-3" aria-labelledby="t-solo">
              <div className="space-y-0.5">
                <h2 id="t-solo" className="h2">Flashcards et jeux solo</h2>
                <p className="text-sm text-texte-3">Sans chrono, sur les notions du cours et les questions des quiz déjà passés. Chaque session terminée rapporte +{SOLO.GEMMES_PAR_SESSION} gemmes pour ta semaine ({SOLO.MAX_PAR_JOUR} max. par jour).</p>
              </div>
              <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                {matieres.map((m) => {
                  const pret = m.cartes >= FLASHCARDS.MIN;
                  return (
                    <li key={m.id} className="card space-y-3 p-3.5 lg:p-4">
                      <Link href={`/matieres/${m.id}`} className="group flex items-center gap-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold group-hover:text-accent-fort">{m.nom}</span>
                          <span className="block truncate text-xs text-texte-3">{m.groupe} · <span className="num">{m.cartes}</span> carte{m.cartes > 1 ? "s" : ""}</span>
                        </span>
                        <Icon name="chevronRight" size={18} className="text-texte-3 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                      {pret ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Link href={`/matieres/${m.id}/flashcards`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] bg-accent-doux px-2 text-sm font-bold text-accent-fort transition-transform hover:-translate-y-px active:translate-y-px">
                            <Icon name="cards" size={17} />Flashcards
                          </Link>
                          <Link href={`/matieres/${m.id}/memory`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] bg-or-doux px-2 text-sm font-bold text-or transition-transform hover:-translate-y-px active:translate-y-px">
                            <Icon name="target" size={17} />Memory
                          </Link>
                        </div>
                      ) : (
                        <p className="rounded-[12px] bg-surface-2 px-3 py-2.5 text-sm text-texte-3">Disponible dès qu’un cours est importé ou après les premiers quiz.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <section className="space-y-3" aria-labelledby="t-groupes">
            <h2 id="t-groupes" className="h2">Mes groupes</h2>
            {groupes.length === 0 && (
              <div className="card space-y-1">
                <p className="font-semibold">Pas encore de groupe</p>
                <p className="muted">Crée le tien, ou rejoins celui de tes amis avec leur code d&apos;invitation.</p>
              </div>
            )}
            <ul className="space-y-2.5">
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
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/groupes/nouveau" className="btn-primary"><Icon name="plus" size={18} />Créer</Link>
              <Link href="/rejoindre" className="btn-white">Rejoindre</Link>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
