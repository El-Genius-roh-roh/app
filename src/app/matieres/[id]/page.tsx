import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor, ranges } from "@/lib/subjects";
import { importer, supprimer, monter, genererQuiz, jourSuivant } from "./actions";
import { todayParis } from "@/lib/clock";
import AutoRefresh from "@/components/AutoRefresh";
import QuizCard from "./QuizCard";
import Classements from "./Classements";

type Doc = { id: string; nom: string; categorie: "cours" | "annale"; ordre: number; nb_pages: number | null; statut: "traitement" | "pret" | "erreur"; erreur: string | null };
type DayRow = { id: string; saison: number; jour: number; date: string; doc_id: string | null; doc_nom: string | null; numeros: number[] | null; chapitres: string[] | null; notions: string[] | null; first_page: string | null };

const STATUT = { traitement: "⏳ en traitement", pret: "✅ prêt", erreur: "❌ erreur" } as const;

export default async function Matiere({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saison?: string }> }) {
  const { id } = await params;
  const { saison: saisonParam } = await searchParams;
  const u = await requireUser();
  const ctx = await getSubjectFor(id, u.id);
  if (!ctx) notFound();
  const { subject: s, canManage } = ctx;

  const docs = await q<Doc>("select id,nom,categorie,ordre,nb_pages,statut,erreur from documents where subject_id=$1 order by categorie,ordre,created_at", [id]);
  const rows = await q<DayRow>(
    `select g.id, g.saison, g.jour_dans_saison as jour, to_char(g.date,'YYYY-MM-DD') as date,
            d.id as doc_id, d.nom as doc_nom,
            array_agg(p.numero order by p.numero) filter (where p.id is not null) as numeros,
            array_remove(array_agg(distinct p.chapitre), null) as chapitres,
            (array_agg(p.id order by p.numero) filter (where p.id is not null))[1] as first_page,
            null::text[] as notions
       from game_days g
       left join game_day_pages gp on gp.game_day_id=g.id
       left join document_pages p on p.id=gp.page_id
       left join documents d on d.id=p.document_id
      where g.subject_id=$1
      group by g.id, g.saison, g.jour_dans_saison, g.date, d.id, d.nom, d.ordre
      order by g.saison, g.jour_dans_saison, d.ordre`, [id]);
  const byDay = new Map<string, DayRow[]>();
  for (const r of rows) (byDay.get(r.id) ?? byDay.set(r.id, []).get(r.id)!).push(r);
  const days = [...byDay.values()];
  const today = await todayParis();
  const enCours = docs.some((d) => d.statut === "traitement");
  const saisons = [...new Set(days.map((d) => d[0].saison))];
  const profil = s.profil_examen as { types_de_questions?: string[]; notions_frequentes?: string[]; nb_annales?: number; source?: string } | null;

  return (
    <main className="mx-auto max-w-md p-4 space-y-5">
      {enCours && <AutoRefresh />}
      <Link href={`/groupes/${s.group_id}`} className="text-sm text-indigo-600">← Groupe</Link>
      <header>
        <h1 className="text-xl font-bold">{s.nom}</h1>
        <p className="text-xs text-gray-500">{s.nb_saisons} saison(s) × {s.jours_par_saison} jours · début {s.date_debut}</p>
      </header>

      <QuizCard subjectId={id} userId={u.id} today={today} />
      {canManage && process.env.DEMO_MODE === "1" && (
        <section className="rounded border border-dashed border-amber-400 bg-amber-50 p-3 text-xs space-y-2">
          <p><b>Outils de démo</b> · date simulée : {today}</p>
          <div className="flex gap-2">
            <form action={genererQuiz}><input type="hidden" name="subject" value={id} /><button className="rounded border border-amber-500 px-2 py-1">Générer les quiz (J et J+1)</button></form>
            <form action={jourSuivant}><input type="hidden" name="subject" value={id} /><button className="rounded border border-amber-500 px-2 py-1">Passer au jour suivant</button></form>
          </div>
        </section>
      )}

      <Classements subjectId={id} userId={u.id} today={today} saisonParam={saisonParam} />

      <section className="space-y-2">
        <h2 className="font-semibold">Documents</h2>
        {docs.length === 0 && <p className="text-sm text-gray-500">Aucun document importé.</p>}
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="rounded border p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <a href={`/api/documents/${d.id}/file`} target="_blank" className="font-medium text-indigo-700 truncate">{d.nom}</a>
                <span className="shrink-0 text-xs">{STATUT[d.statut]}</span>
              </div>
              <div className="text-xs text-gray-500">{d.categorie === "cours" ? `Cours n°${d.ordre}` : "Annale"}{d.nb_pages ? ` · ${d.nb_pages} pages` : ""}{d.erreur ? ` · ${d.erreur}` : ""}</div>
              {canManage && (
                <div className="mt-1 flex gap-3 text-xs">
                  {d.categorie === "cours" && d.ordre > 1 && <form action={monter}><input type="hidden" name="subject" value={id} /><input type="hidden" name="doc" value={d.id} /><button className="underline">↑ monter</button></form>}
                  <form action={supprimer}><input type="hidden" name="subject" value={id} /><input type="hidden" name="doc" value={d.id} /><button className="text-red-600 underline">supprimer</button></form>
                </div>
              )}
            </li>
          ))}
        </ul>
        {canManage && (
          <form action={importer} className="space-y-2 rounded border border-dashed p-3">
            <input type="hidden" name="subject" value={id} />
            <h3 className="text-sm font-semibold">Importer des PDF</h3>
            <select name="categorie" className="w-full rounded border p-2 text-sm">
              <option value="cours">Document de cours</option>
              <option value="annale">Annale</option>
            </select>
            <input type="file" name="fichier" accept="application/pdf" multiple required className="w-full text-sm" />
            <button className="w-full rounded bg-indigo-600 p-2 text-white">Importer</button>
            <p className="text-xs text-gray-500">Les slides ajoutées en cours de saison redécoupent uniquement les jours futurs.</p>
          </form>
        )}
      </section>

      {profil && (
        <section className="rounded bg-indigo-50 p-3 text-sm space-y-1">
          <h2 className="font-semibold">Profil d&apos;examen {profil.source === "simulé" && <span className="text-xs font-normal text-gray-500">(IA simulée)</span>}</h2>
          <p>Questions types : {profil.types_de_questions?.join(", ")}</p>
          <p className="text-xs text-gray-600">Notions fréquentes : {profil.notions_frequentes?.slice(0, 8).join(", ")}</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Programme</h2>
        {days.length === 0 && <p className="text-sm text-gray-500">Le programme apparaît dès qu&apos;un cours est prêt.</p>}
        {saisons.map((sa) => (
          <div key={sa} className="space-y-1">
            <h3 className="text-sm font-semibold text-indigo-700">Saison {sa}</h3>
            <ol className="space-y-1">
              {days.filter((d) => d[0].saison === sa).map((d) => {
                const head = d[0];
                const vide = !head.doc_id;
                return (
                  <li key={head.id} className={`rounded border p-2 text-sm ${head.date === today ? "border-indigo-500 bg-indigo-50" : ""}`}>
                    <div className="flex justify-between"><b>Jour {head.jour}</b><span className="text-xs text-gray-500">{head.date}{head.date === today ? " · aujourd'hui" : ""}</span></div>
                    {vide ? <p className="text-xs text-gray-500">Jour de révision (10 questions de révision)</p> : d.map((r) => (
                      <div key={r.doc_id} className="text-xs">
                        <span className="text-gray-700">{r.chapitres?.join(" · ") || "—"}</span> —{" "}
                        <a className="text-indigo-700 underline" target="_blank" href={`/api/documents/${r.doc_id}/file#page=${r.numeros![0]}`}>{r.doc_nom} p.{ranges(r.numeros!)}</a>
                      </div>
                    ))}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>
    </main>
  );
}
