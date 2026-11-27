import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";
import { getGroupResults, getGroupTrophees } from "@/lib/ranking";
import { ligueDe, vitrine } from "@/lib/trophees";
import { todayGroupe } from "@/lib/clock";
import { CONFIG } from "@/config/constants";
import { LigueCard, Vitrine } from "@/components/Trophees";
import { fmtMs } from "@/components/RankTable";
import Avatar from "@/components/Avatar";
import NextButton from "@/components/NextButton";

/** Fiche d'un joueur dans un groupe : ouverte en touchant son nom dans un classement. */
export default async function Joueur({ params }: { params: Promise<{ id: string; uid: string }> }) {
  const { id, uid } = await params;
  const u = await requireUser();
  if (!(await memberRole(id, u.id)) || !(await memberRole(id, uid))) notFound();
  const [p] = await q<{ pseudo: string; avatar_v: number | null }>("select coalesce(pseudo,'?') as pseudo, avatar_v from profiles where id=$1", [uid]);
  const [g] = await q<{ nom: string }>("select nom from groups where id=$1", [id]);

  const tr = await getGroupTrophees(id);
  const ligne = tr.lignes.find((l) => l.userId === uid);
  const trophees = ligne?.trophees ?? 0;
  const resultats = await getGroupResults(id);
  const v = vitrine(resultats, uid, await todayGroupe(id));
  const miens = resultats.filter((r) => r.userId === uid);
  const moyenne = miens.length ? miens.reduce((a, r) => a + CONFIG.QUESTIONS_PAR_JOUR - r.erreurs, 0) / miens.length : null;
  const tempsMoyen = miens.length ? miens.reduce((a, r) => a + r.dureeMs, 0) / miens.length : null;
  const victoires = miens.filter((r) => r.rang === 1 && resultats.filter((x) => x.dayId === r.dayId).length >= 2).length;

  const matieres = await q<{ id: string; nom: string; joues: number; moyenne: number | null }>(
    `select s.id, s.nom, count(r.game_day_id)::int as joues, avg(${CONFIG.QUESTIONS_PAR_JOUR} - r.erreurs)::float8 as moyenne
       from subjects s left join game_days g on g.subject_id=s.id
       left join daily_results r on r.game_day_id=g.id and r.user_id=$2
      where s.group_id=$1 group by s.id, s.nom, s.created_at order by s.created_at`, [id, uid]);

  const ordre = [...tr.lignes].sort((a, b) => a.rang - b.rang);
  const i = ordre.findIndex((l) => l.userId === uid);
  const suivant = ordre.length > 1 ? ordre[(i + 1) % ordre.length] : null;
  const moi = uid === u.id;

  const Stat = ({ v, l }: { v: string; l: string }) => (
    <div className="card p-3 text-center">
      <p className="font-titre text-2xl font-bold text-accent-700 tabular-nums">{v}</p>
      <p className="text-xs font-semibold text-slate-500">{l}</p>
    </div>
  );

  return (
    <main className="page lg:max-w-4xl">
      <Link href={`/groupes/${id}`} className="back">{g.nom}</Link>
      <header className="hero flex items-center gap-4">
        <Avatar id={uid} pseudo={p.pseudo} v={p.avatar_v} size={88} className="ring-4" />
        <div className="min-w-0">
          <h1 className="truncate text-3xl">{p.pseudo}{moi ? " (moi)" : ""}</h1>
          {ligne && <p className="mt-1 font-semibold text-white/90">{ligne.rang === 1 ? "1er" : `${ligne.rang}e`} du groupe sur {tr.lignes.length}</p>}
          {moi && <Link href="/profil" className="mt-2 inline-block rounded-full bg-white/25 px-3 py-1 text-sm backdrop-blur">Modifier ma photo</Link>}
        </div>
      </header>

      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-5">
          <LigueCard info={ligueDe(trophees)} trophees={trophees} serie={v.serieActuelle} />
          <div className="grid grid-cols-2 gap-3">
            <Stat v={String(v.quizJoues)} l="quiz joués" />
            <Stat v={moyenne === null ? "–" : `${moyenne.toFixed(1).replace(".", ",")}/${CONFIG.QUESTIONS_PAR_JOUR}`} l="note moyenne" />
            <Stat v={String(victoires)} l={victoires > 1 ? "victoires" : "victoire"} />
            <Stat v={tempsMoyen === null ? "–" : fmtMs(tempsMoyen)} l="temps moyen" />
          </div>
        </div>
        <div className="space-y-5">
          <Vitrine data={v} titre={moi ? "Mes badges" : `Badges de ${p.pseudo}`} />
          {matieres.length > 0 && (
            <section className="card space-y-2">
              <h2 className="h2">Par matière</h2>
              {matieres.map((m) => (
                <Link key={m.id} href={`/matieres/${m.id}`}
                  className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 transition hover:bg-white/70">
                  <span className="flex-1 truncate">{m.nom}</span>
                  <span className="font-sans text-xs font-semibold text-slate-600">
                    {m.joues ? `${m.joues} quiz · ${m.moyenne!.toFixed(1).replace(".", ",")}/${CONFIG.QUESTIONS_PAR_JOUR}` : "pas encore joué"}
                  </span>
                  <span aria-hidden className="text-accent-400">›</span>
                </Link>
              ))}
            </section>
          )}
        </div>
      </div>

      {suivant && suivant.userId !== uid
        ? <NextButton href={`/groupes/${id}/joueurs/${suivant.userId}`} sub="Joueur suivant du classement">{suivant.pseudo}</NextButton>
        : <NextButton href={`/groupes/${id}`}>Retour au groupe</NextButton>}
    </main>
  );
}
