import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { todayParis } from "@/lib/clock";

export default async function Historique({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const ctx = await getSubjectFor(id, u.id);
  if (!ctx) notFound();
  const today = await todayParis();
  const rows = await q<{ id: string; saison: number; jour: number; date: string; statut: string | null; erreurs: number | null; points: number | null }>(
    `select g.id, g.saison, g.jour_dans_saison as jour, to_char(g.date,'YYYY-MM-DD') as date, a.statut, a.erreurs, r.points
       from game_days g
       left join attempts a on a.game_day_id=g.id and a.user_id=$2
       left join daily_results r on r.game_day_id=g.id and r.user_id=$2
      where g.subject_id=$1 and g.date < $3::date and exists (select 1 from questions x where x.game_day_id=g.id)
      order by g.date desc`, [id, u.id, today]);
  return (
    <main className="mx-auto max-w-md p-4 space-y-3">
      <Link href={`/matieres/${id}`} className="text-sm text-indigo-600">← {ctx.subject.nom}</Link>
      <h1 className="text-xl font-bold">Historique des quiz</h1>
      {rows.length === 0 && <p className="text-sm text-gray-500">Aucun quiz passé pour l&apos;instant.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/quiz/${r.id}`} className="flex items-center justify-between rounded border p-3 text-sm">
              <span>Saison {r.saison} · jour {r.jour} <span className="text-xs text-gray-500">{r.date}</span></span>
              <span className="text-xs">{r.statut ? `${10 - (r.erreurs ?? 0)}/10 · ${r.points ?? 0} pts` : "non joué · 0 pt"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
