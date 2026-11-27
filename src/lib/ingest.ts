import path from "path";
import { q } from "./db";
import { extractPdf } from "./pdf";
import { analyzePages } from "./ai";
import { rebuildSchedule } from "./schedule";

export const STORAGE = path.join(process.cwd(), "storage");

async function logCall(subjectId: string, etape: string, ms: number, statut: string) {
  await q("insert into ai_calls(subject_id,etape,modele,duree_ms,statut) values ($1,$2,$3,$4,$5)",
    [subjectId, etape, "mock", ms, statut]);
}

/** Traitement en tâche de fond : extraction → analyse → découpage en jours (cours). */
export async function processDocument(docId: string) {
  const [doc] = await q<{ id: string; subject_id: string; categorie: "cours" | "annale"; fichier_path: string }>(
    "select id,subject_id,categorie,fichier_path from documents where id=$1", [docId]);
  if (!doc) return;
  try {
    const pages = await extractPdf(doc.fichier_path, path.join(STORAGE, "pages", doc.id));
    const t0 = Date.now();
    const analysis = doc.categorie === "cours" ? await analyzePages(pages.map((p) => p.texte)) : null;
    if (analysis) await logCall(doc.subject_id, "analyse_pages", Date.now() - t0, "ok");

    await q("delete from document_pages where document_id=$1", [doc.id]);
    for (const [i, p] of pages.entries()) {
      const a = analysis?.[i];
      await q(
        `insert into document_pages(document_id,numero,texte,image_path,type,chapitre,densite,notions)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [doc.id, p.numero, p.texte, p.imagePath, a?.type ?? null, a?.chapitre ?? null, a?.densite ?? null, JSON.stringify(a?.notions ?? [])]);
    }
    await q("update documents set nb_pages=$2, statut='pret', erreur=null where id=$1", [doc.id, pages.length]);

    // les annales servent d'exemples de style dans le prompt envoyé au chat
    if (doc.categorie === "cours") await rebuildSchedule(doc.subject_id);
  } catch (e) {
    console.error("processDocument", e);
    await q("update documents set statut='erreur', erreur=$2 where id=$1", [docId, String((e as Error).message).slice(0, 300)]);
  }
}
