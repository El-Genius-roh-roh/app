// Extraction des notions d'un cours (D39), en tâche de fond : l'IA si elle est configurée (lots de pages, résultats
// ancrés dans le texte), sinon une détection simple. Ne casse jamais l'import du cours : toute erreur est seulement notée.
import { NOTIONS } from "@/config/constants";
import { pool, q } from "./db";
import { chatLLM, llmConfigured } from "./ai/llm";
import { ancrer, dedoublonner, detecterDefinitions, lireReponseIA, normTerme, promptNotions, type NotionBrute } from "./notions";

type Page = { numero: number; texte: string };

async function viaIA(matiere: string, pages: Page[]): Promise<NotionBrute[]> {
  const out: NotionBrute[] = [];
  for (let i = 0; i < pages.length; i += NOTIONS.PAGES_PAR_APPEL) {
    const lot = pages.slice(i, i + NOTIONS.PAGES_PAR_APPEL).filter((p) => (p.texte ?? "").trim().length > 20);
    if (!lot.length) continue;
    const r = await chatLLM([{ role: "user", content: promptNotions(matiere, lot) }], { maxTokens: 3000, temperature: 0.2 });
    out.push(...ancrer(lireReponseIA(r), lot));
  }
  return out;
}

/** Extrait (ou ré-extrait) les notions d'un document de cours. Remplace ses notions « ia » / « auto », garde les manuelles. */
export async function extraireNotionsDocument(docId: string): Promise<{ n: number; source: "ia" | "auto" }> {
  const [doc] = await q<{ subject_id: string; nom: string }>(
    "select d.subject_id, s.nom from documents d join subjects s on s.id=d.subject_id where d.id=$1 and d.categorie='cours'", [docId]);
  if (!doc) return { n: 0, source: "auto" };
  const pages = await q<Page>("select numero, coalesce(texte,'') as texte from document_pages where document_id=$1 order by numero", [docId]);
  let items: NotionBrute[] = [];
  let source: "ia" | "auto" = "auto";
  if (llmConfigured()) {
    try { items = await viaIA(doc.nom, pages); source = "ia"; }
    catch (e) { console.error("notions IA", (e as Error).message); items = []; }
  }
  if (!items.length) { items = detecterDefinitions(pages); source = "auto"; }

  const c = await pool.connect();
  try {
    await c.query("begin");
    // une extraction à la fois par matière (import du cours et bouton « Extraire » peuvent se croiser)
    await c.query("select pg_advisory_xact_lock(hashtext($1))", [`notions:${doc.subject_id}`]);
    await c.query("delete from notions where document_id=$1 and source in ('ia','auto')", [docId]);
    // un terme déjà présent dans la matière (autre document ou notion manuelle) n'est pas ajouté une deuxième fois
    const { rows } = await c.query<{ terme: string }>("select terme from notions where subject_id=$1", [doc.subject_id]);
    const deja = new Set(rows.map((r) => normTerme(r.terme)));
    const nouvelles = dedoublonner(items).filter((x) => !deja.has(normTerme(x.terme)));
    for (const x of nouvelles) {
      await c.query("insert into notions(subject_id,document_id,page,terme,definition,source) values ($1,$2,$3,$4,$5,$6)",
        [doc.subject_id, docId, x.page, x.terme, x.definition, source]);
    }
    await c.query("commit");
    return { n: nouvelles.length, source };
  } catch (e) {
    await c.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

/* ------------------------------------------------------------------ extraction de toute une matière (bouton du gestionnaire) */

export type EtatExtraction = { enCours: boolean; debut: number; n?: number; source?: "ia" | "auto"; erreur?: string };
const etats = new Map<string, EtatExtraction>();
export const etatExtraction = (subjectId: string) => etats.get(subjectId) ?? null;

/** Lance l'extraction sur tous les cours prêts d'une matière, sans bloquer la requête. */
export function lancerExtraction(subjectId: string) {
  if (etats.get(subjectId)?.enCours) return;
  etats.set(subjectId, { enCours: true, debut: Date.now() });
  (async () => {
    const docs = await q<{ id: string }>("select id from documents where subject_id=$1 and categorie='cours' and statut='pret' order by ordre, created_at", [subjectId]);
    let n = 0, source: "ia" | "auto" = "auto";
    for (const d of docs) { const r = await extraireNotionsDocument(d.id); n += r.n; if (r.source === "ia") source = "ia"; }
    etats.set(subjectId, { enCours: false, debut: etats.get(subjectId)!.debut, n, source });
  })().catch((e) => etats.set(subjectId, { enCours: false, debut: Date.now(), erreur: (e as Error).message }));
}

/**
 * Nombre de cartes jouables d'une matière, en SQL (D39) : notions du cours + énoncés distincts des questions vérifiées
 * des jours passés. Sert aux seuils (flashcards, Memory, gemmes solo) et au hub Réviser.
 */
export const sqlNbCartes = (subjectCol: string, today: string) => `(
  (select count(*) from notions n where n.subject_id=${subjectCol})
  + (select count(distinct lower(btrim(qq.enonce))) from questions qq join game_days gd on gd.id=qq.game_day_id
      where qq.subject_id=${subjectCol} and qq.verifiee and gd.date < ${today}))::int`;
