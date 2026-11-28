import Link from "next/link";
import { BookOpen, ChevronRight, Plus, Swords, UserPlus, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import { q } from "@/lib/db";
import { APP_NAME } from "@/config/constants";
import AutoRefresh from "@/components/AutoRefresh";

type GroupeRow = {
  id: string;
  nom: string;
  nb_membres: number;
  nb_matieres: number;
  quiz_a_faire: number;
};

export default async function Accueil() {
  const u = await requireUser();
  const groupes = await q<GroupeRow>(
    `select g.id, g.nom,
            (select count(*)::int from group_members gm where gm.group_id = g.id) as nb_membres,
            (select count(*)::int from subjects s where s.group_id = g.id) as nb_matieres,
            (select count(*)::int from game_days gd
               join subjects s on s.id = gd.subject_id
               left join attempts a on a.game_day_id = gd.id and a.user_id = $1
              where s.group_id = g.id
                and gd.date = (now() at time zone 'Europe/Paris')::date
                and (a.statut is null or a.statut = 'en_cours')) as quiz_a_faire
       from groups g
       join group_members m on m.group_id = g.id
      where m.user_id = $1
      order by g.created_at`,
    [u.id]
  );

  return (
    <main className="page">
      <AutoRefresh every={30000} />
      <header className="flex items-center justify-between">
        <div>
          <h1 className="title">{APP_NAME}</h1>
          <p className="muted mt-0.5">Révisions gamifiées entre amis</p>
        </div>
        <Link href="/profil"
          className="flex items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-px hover:shadow-md">
          <Avatar id={u.id} pseudo={u.pseudo ?? "?"} v={u.avatar_v} size={30} />
          <span className="max-w-28 truncate">{u.pseudo}</span>
        </Link>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="h2">Mes groupes</h2>
          <Link href="/arene" className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700 transition hover:bg-accent-100">
            <Swords className="h-3.5 w-3.5" />
            Mode Arène
          </Link>
        </div>

        {groupes.length === 0 ? (
          <div className="card space-y-2 py-8 text-center">
            <p className="font-semibold">Aucun groupe pour le moment</p>
            <p className="muted">Crée un groupe ou rejoins celui de tes amis avec un code d&apos;invitation.</p>
          </div>
        ) : (
          <ul className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
            {groupes.map((g) => (
              <li key={g.id}>
                <Link href={`/groupes/${g.id}`} className="card-lien group flex flex-col justify-between gap-3 py-4 lg:min-h-32">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-lg font-semibold lg:text-xl">{g.nom}</span>
                    {g.quiz_a_faire > 0 ? (
                      <span className="chip shrink-0 bg-accent-500 text-white">{g.quiz_a_faire} à faire</span>
                    ) : g.nb_matieres > 0 ? (
                      <span className="chip shrink-0 bg-emerald-50 text-emerald-700">À jour</span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{g.nb_membres}</span>
                      <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{g.nb_matieres} matière{g.nb_matieres > 1 ? "s" : ""}</span>
                    </span>
                    <ChevronRight className="chevron h-5 w-5" aria-hidden />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:flex lg:max-w-md">
        <Link href="/groupes/nouveau" className="btn-primary">
          <Plus className="h-5 w-5" /> Créer
        </Link>
        <Link href="/rejoindre" className="btn-ghost">
          <UserPlus className="h-5 w-5" /> Rejoindre
        </Link>
      </div>
    </main>
  );
}
