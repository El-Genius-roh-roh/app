import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { llmConfigured } from "@/lib/ai/llm";
import { etatExtraction } from "@/lib/notions-extraction";
import { NOTIONS } from "@/config/constants";
import AutoRefresh from "@/components/AutoRefresh";
import Tex from "@/components/Tex";
import Icon from "@/components/Icon";
import { enregistrerNotion, extraireNotions, supprimerNotion } from "./actions";

export const dynamic = "force-dynamic";

type Notion = { id: string; terme: string; definition: string; source: "ia" | "auto" | "manuelle"; page: number | null; doc: string | null };
const SOURCE = { ia: { label: "IA", cls: "bg-accent-doux text-accent-fort" }, auto: { label: "Auto", cls: "bg-surface-2 text-texte-2" }, manuelle: { label: "Relue", cls: "bg-ok-doux text-ok" } } as const;

/** Glossaire de la matière (D39) : notions du cours pour les flashcards et le Memory ; relu et corrigé par les gestionnaires. */
export default async function Notions({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const ctx = await getSubjectFor(id, u.id);
  if (!ctx) notFound();
  const { canManage } = ctx;
  const notions = await q<Notion>(
    `select n.id, n.terme, n.definition, n.source, n.page, d.nom as doc from notions n left join documents d on d.id=n.document_id
      where n.subject_id=$1 order by d.ordre nulls last, n.page nulls last, lower(n.terme)`, [id]);
  const [{ cours }] = await q<{ cours: number }>("select count(*)::int as cours from documents where subject_id=$1 and categorie='cours' and statut='pret'", [id]);
  const etat = canManage ? etatExtraction(id) : null;
  const hidden = <input type="hidden" name="subject" value={id} />;

  return (
    <main className="page lg:max-w-4xl">
      {etat?.enCours && <AutoRefresh every={3000} />}
      <Link href={`/matieres/${id}`} className="back"><Icon name="arrowLeft" size={16} />{ctx.subject.nom}</Link>
      <header className="entree space-y-1">
        <p className="eyebrow">Notions du cours · {ctx.subject.nom}</p>
        <h1 className="title">Glossaire</h1>
        <p className="muted max-w-2xl">
          Les concepts et leurs définitions, tirés des cours importés. Ils alimentent les flashcards et le Memory.
          {canManage && " Relis-les et corrige-les : une notion corrigée n'est plus jamais remplacée par une nouvelle extraction."}
        </p>
      </header>

      {canManage && (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <form action={extraireNotions} className="shrink-0">{hidden}
              <button disabled={etat?.enCours || cours === 0} className="btn-primary w-auto disabled:opacity-60">
                <Icon name="sparkles" size={17} />{etat?.enCours ? "Extraction en cours…" : "Extraire les définitions du cours"}
              </button>
            </form>
            <p className="min-w-[14rem] flex-1 text-sm text-texte-3">
              {cours === 0 ? "Importe d'abord un cours (PDF) dans la matière."
                : llmConfigured() ? `L'IA lit les ${cours} cours importé${cours > 1 ? "s" : ""} et ne garde que les termes présents dans le texte.`
                : "IA non configurée : détection simple des phrases « X : … », « X est … », « On appelle X … », « Définition de X ». À relire."}
            </p>
          </div>
          {etat && !etat.enCours && (etat.erreur
            ? <p className="text-sm font-semibold text-ko">Échec de l&apos;extraction : {etat.erreur}</p>
            : <p className="text-sm font-semibold text-ok"><span className="num">{etat.n}</span> notion{(etat.n ?? 0) > 1 ? "s" : ""} trouvée{(etat.n ?? 0) > 1 ? "s" : ""} ({etat.source === "ia" ? "IA" : "détection simple"}).</p>)}
          <details className="group/n">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-accent-fort"><Icon name="plus" size={17} />Ajouter une notion</summary>
            <form action={enregistrerNotion} className="mt-2 space-y-2">{hidden}
              <input name="terme" required maxLength={NOTIONS.TERME_MAX} placeholder="Notion (ex. Estimateur sans biais)" aria-label="Notion" className="input" />
              <textarea name="definition" required maxLength={NOTIONS.DEFINITION_MAX} rows={2} placeholder="Définition, en une phrase" aria-label="Définition" className="input" />
              <button className="btn-white w-auto"><Icon name="check" size={17} />Ajouter</button>
            </form>
          </details>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="t-notions">
        <div className="flex items-baseline justify-between">
          <h2 id="t-notions" className="h2">Notions</h2>
          <span className="num text-sm text-texte-3">{notions.length}</span>
        </div>
        {notions.length === 0 ? (
          <div className="card space-y-1">
            <p className="font-semibold">Pas encore de notion</p>
            <p className="muted">{canManage ? "Lance l'extraction ou ajoute des notions à la main." : "Les gestionnaires de la matière n'ont pas encore extrait de notions du cours."} En attendant, les flashcards et le Memory utilisent les questions des quiz passés.</p>
          </div>
        ) : (
          <ul className="liste">
            {notions.map((n) => (
              <li key={n.id} className="ligne block space-y-1.5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 font-bold"><Tex>{n.terme}</Tex></p>
                  {canManage && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${SOURCE[n.source].cls}`}>{SOURCE[n.source].label}</span>}
                </div>
                <p className="text-[15px] text-texte-2"><Tex>{n.definition}</Tex></p>
                {n.doc && <p className="text-xs text-texte-3">{n.doc}{n.page ? ` · page ${n.page}` : ""}</p>}
                {canManage && (
                  <details className="group/e">
                    <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-sm font-semibold text-texte-3 hover:text-texte"><Icon name="pencil" size={15} />Corriger</summary>
                    <div className="mt-2 space-y-2">
                      <form action={enregistrerNotion} className="space-y-2">{hidden}
                        <input type="hidden" name="notion" value={n.id} />
                        <input name="terme" required defaultValue={n.terme} maxLength={NOTIONS.TERME_MAX} aria-label="Notion" className="input" />
                        <textarea name="definition" required defaultValue={n.definition} maxLength={NOTIONS.DEFINITION_MAX} rows={2} aria-label="Définition" className="input" />
                        <button className="btn-white w-auto"><Icon name="check" size={17} />Enregistrer</button>
                      </form>
                      <form action={supprimerNotion}>{hidden}
                        <input type="hidden" name="notion" value={n.id} />
                        <button className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ko"><Icon name="trash" size={15} />Supprimer</button>
                      </form>
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
