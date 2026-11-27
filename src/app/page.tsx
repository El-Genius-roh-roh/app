import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { sqlToday } from "@/lib/clock";
import { CONFIG } from "@/config/constants";
import Icon from "@/components/Icon";

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
  const aJouer = jours.filter((j) => !j.statut || j.statut === "en_cours").length;

  return (
    <main className="page">
      <header className="entree space-y-1">
        <p className="eyebrow">Salut {u.pseudo}</p>
        <h1 className="title">
          {jours.length === 0 ? "Prêt à réviser ?" : aJouer === 0 ? "Tout est joué aujourd'hui" : `${aJouer} quiz à jouer aujourd'hui`}
        </h1>
      </header>

      <div className="space-y-6 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-8 lg:space-y-0">
        <section className="space-y-3" aria-labelledby="t-jour">
          <h2 id="t-jour" className="eyebrow">Quiz du jour</h2>
          {jours.length === 0 ? (
            <p className="card muted">Aucun quiz prévu aujourd&apos;hui. Crée une matière dans un groupe pour commencer.</p>
          ) : (
            <ul className="liste">
              {jours.map((j) => {
                const fait = j.statut && j.statut !== "en_cours";
                return (
                  <li key={j.day_id}>
                    <Link href={fait ? `/matieres/${j.subject_id}` : `/quiz/${j.day_id}`} className="ligne group min-h-16 transition-colors hover:bg-surface-2">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${fait ? "bg-ok/12 text-ok" : "bg-accent text-sur-accent"}`}>
                        <Icon name={fait ? "check" : "play"} size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{j.matiere}</span>
                        <span className="block truncate text-sm text-texte-3">{j.groupe} · jour {j.jour}</span>
                      </span>
                      {fait ? (
                        <span className="text-right">
                          <span className="num block text-lg font-bold">{CONFIG.QUESTIONS_PAR_JOUR - (j.erreurs ?? 0)}/{CONFIG.QUESTIONS_PAR_JOUR}</span>
                          {j.rang && <span className="num block text-xs text-or">{j.rang === 1 ? "1er" : `${j.rang}e`}</span>}
                        </span>
                      ) : (
                        <span className="num text-sm font-semibold text-accent">{j.statut === "en_cours" ? "Reprendre" : "Jouer"}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="t-groupes">
          <h2 id="t-groupes" className="eyebrow">Mes groupes</h2>
          {groupes.length === 0 && <p className="card muted">Crée un groupe ou rejoins celui de tes amis avec son code.</p>}
          <ul className="space-y-2">
            {groupes.map((g) => (
              <li key={g.id}>
                <Link href={`/groupes/${g.id}`} className="tuile group flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-texte-2"><Icon name="users" size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{g.nom}</span>
                    <span className="num block text-xs text-texte-3">{g.membres} membre{g.membres > 1 ? "s" : ""} · {g.matieres} matière{g.matieres > 1 ? "s" : ""}</span>
                  </span>
                  <Icon name="chevronRight" className="text-texte-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/groupes/nouveau" className="btn-primary"><Icon name="plus" size={18} />Créer un groupe</Link>
            <Link href="/rejoindre" className="btn-white">Rejoindre</Link>
          </div>
          <Link href="/arene" className="tuile group flex items-center gap-3 border-accent/30">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent"><Icon name="swords" size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-titre">Arène</span>
              <span className="block text-sm text-texte-3">Duels en direct sur les quiz passés</span>
            </span>
            <Icon name="chevronRight" className="text-texte-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>
      </div>
    </main>
  );
}
