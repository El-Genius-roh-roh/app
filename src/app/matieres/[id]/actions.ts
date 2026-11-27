"use server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { processDocument, STORAGE } from "@/lib/ingest";
import { rebuildSchedule } from "@/lib/schedule";
import { freezePastDays, generateUpcoming } from "@/lib/quiz/service";
import { addDays, setDemoToday, todayParis } from "@/lib/clock";
import { importChatAnswer, type ImportResult } from "@/lib/quiz/chat";
import { genererAvecIA, llmConfigured } from "@/lib/quiz/ai";

async function manager(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("subject") ?? "");
  const c = await getSubjectFor(id, user.id);
  return c?.canManage ? id : null;
}

export async function importer(fd: FormData) {
  const id = await manager(fd);
  if (!id) return;
  const categorie = fd.get("categorie") === "annale" ? "annale" : "cours";
  const files = fd.getAll("fichier").filter((f): f is File => f instanceof File && f.size > 0);
  fs.mkdirSync(path.join(STORAGE, "documents"), { recursive: true });
  for (const f of files) {
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") continue;
    const docId = randomUUID();
    const file = path.join(STORAGE, "documents", `${docId}.pdf`);
    fs.writeFileSync(file, Buffer.from(await f.arrayBuffer()));
    const [{ n }] = await q<{ n: number }>("select coalesce(max(ordre),0)+1 as n from documents where subject_id=$1 and categorie=$2", [id, categorie]);
    await q("insert into documents(id,subject_id,categorie,nom,ordre,fichier_path) values ($1,$2,$3,$4,$5,$6)", [docId, id, categorie, f.name, n, file]);
    void processDocument(docId); // tâche de fond : le statut est visible dans l'interface
  }
  revalidatePath(`/matieres/${id}`);
}

export async function supprimer(fd: FormData) {
  const id = await manager(fd);
  if (!id) return;
  await q("delete from documents where id=$1 and subject_id=$2", [String(fd.get("doc")), id]);
  await rebuildSchedule(id);
  revalidatePath(`/matieres/${id}`);
}

export async function monter(fd: FormData) {
  const id = await manager(fd);
  if (!id) return;
  const docId = String(fd.get("doc"));
  const [d] = await q<{ ordre: number }>("select ordre from documents where id=$1 and subject_id=$2 and categorie='cours'", [docId, id]);
  if (!d) return;
  const [prev] = await q<{ id: string; ordre: number }>(
    "select id,ordre from documents where subject_id=$1 and categorie='cours' and ordre<$2 order by ordre desc limit 1", [id, d.ordre]);
  if (prev) {
    await q("update documents set ordre=$2 where id=$1", [docId, prev.ordre]);
    await q("update documents set ordre=$2 where id=$1", [prev.id, d.ordre]);
    await rebuildSchedule(id);
  }
  revalidatePath(`/matieres/${id}`);
}

/* ---- outils de démo (DEMO_MODE=1) : équivalents manuels des jobs planifiés ---- */
export async function genererQuiz(fd: FormData) {
  const id = await manager(fd);
  if (!id) return;
  await generateUpcoming(id);
  revalidatePath(`/matieres/${id}`);
}

export async function jourSuivant(fd: FormData) {
  const id = await manager(fd);
  if (!id || process.env.DEMO_MODE !== "1") return;
  await setDemoToday(addDays(await todayParis(id), 1), id); // seule CETTE matière avance d'un jour
  await freezePastDays(); // clôture les tentatives de la veille et fige ses résultats
  await generateUpcoming(id); // quiz du jour de cette matière
  revalidatePath(`/matieres/${id}`);
}

/* ---- génération automatique par l'IA ---- */
export type IaState = { resultats?: ImportResult; erreur?: string } | null;

/** Écrit (ou réécrit, si personne n'a commencé) les quiz des prochains jours avec l'IA. */
export async function genererIA(_prev: IaState, fd: FormData): Promise<IaState> {
  const id = await manager(fd);
  if (!id) return { erreur: "Action réservée aux gestionnaires de la matière." };
  if (!llmConfigured()) return { erreur: "IA non configurée sur ce serveur (variables OPENAI_API_KEY et OPENAI_BASE_URL)." };
  const resultats = await genererAvecIA(id, { regenerer: fd.get("regenerer") === "1", limit: 3 });
  revalidatePath(`/matieres/${id}`);
  if (!resultats.length) return { erreur: "Rien à générer : aucun quiz à venir sans questions (ou aucun cours importé)." };
  return { resultats };
}

/* ---- génération par le chat (copier-coller) ---- */
export type ChatState = { resultats?: ImportResult; erreur?: string } | null;

export async function importerChat(_prev: ChatState, fd: FormData): Promise<ChatState> {
  const id = await manager(fd);
  if (!id) return { erreur: "Action réservée aux gestionnaires de la matière." };
  const texte = String(fd.get("reponse") ?? "");
  if (!texte.trim()) return { erreur: "Colle la réponse du chat." };
  try {
    const resultats = await importChatAnswer(id, texte);
    revalidatePath(`/matieres/${id}`);
    return { resultats };
  } catch (e) {
    return { erreur: (e as Error).message };
  }
}

/* ---- gestion de la matière ---- */
export async function renommerMatiere(fd: FormData) {
  const id = await manager(fd);
  const nom = String(fd.get("nom") ?? "").trim().slice(0, 80);
  if (!id || !nom) return;
  await q("update subjects set nom=$2 where id=$1", [id, nom]);
  revalidatePath(`/matieres/${id}`);
}

export async function supprimerMatiere(fd: FormData) {
  const id = await manager(fd);
  if (!id) return;
  const [s] = await q<{ group_id: string }>("select group_id from subjects where id=$1", [id]);
  const docs = await q<{ id: string; fichier_path: string }>("select id,fichier_path from documents where subject_id=$1", [id]);
  await q("delete from subjects where id=$1", [id]); // cascade : documents, jours, questions, tentatives, résultats
  for (const d of docs) {
    fs.rmSync(d.fichier_path, { force: true });
    fs.rmSync(path.join(STORAGE, "pages", d.id), { recursive: true, force: true });
  }
  redirect(`/groupes/${s.group_id}`);
}
