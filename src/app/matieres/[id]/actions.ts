"use server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { processDocument, STORAGE } from "@/lib/ingest";
import { rebuildSchedule } from "@/lib/schedule";
import { freezePastDays, generateUpcoming } from "@/lib/quiz/service";
import { addDays, setDemoToday, todayParis } from "@/lib/clock";

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
  await setDemoToday(addDays(await todayParis(), 1));
  await freezePastDays(); // clôture les tentatives de la veille et fige ses résultats
  await generateUpcoming(); // quiz du jour et du lendemain
  revalidatePath(`/matieres/${id}`);
}
