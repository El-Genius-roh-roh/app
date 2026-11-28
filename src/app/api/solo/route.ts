import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { getSubjectFor } from "@/lib/subjects";
import { sqlToday, todayParis } from "@/lib/clock";
import { FLASHCARDS, MEMORY, RELIER } from "@/config/constants";
import { enregistrerSolo } from "@/lib/solo";
import { sqlNbCartes } from "@/lib/notions-extraction";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fin d'une session solo d'une matière (flashcards, Memory ou Relier) : rapporte des gemmes solo (D37).
 * Les parties d'Arène contre des bots sont enregistrées côté serveur, à la fin de la partie.
 */
export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const type = b.type === "flashcards" || b.type === "memory" || b.type === "relier" ? b.type : null;
  const subjectId = typeof b.subjectId === "string" && UUID.test(b.subjectId) ? b.subjectId : null;
  if (!type || !subjectId) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  if (type === "flashcards" && !u.premium) return NextResponse.json({ error: "Les flashcards sont réservées aux comptes premium." }, { status: 403 });
  const ctx = await getSubjectFor(subjectId, u.id);
  if (!ctx) return NextResponse.json({ error: "Matière introuvable." }, { status: 404 });
  // même source que les jeux : questions vérifiées des jours passés ; pas de gemmes sans assez de cartes
  const [{ n }] = await q<{ n: number }>(`select ${sqlNbCartes("$1::uuid", sqlToday("$1::uuid"))} as n`, [subjectId]);
  if (n < (type === "flashcards" ? FLASHCARDS.MIN : type === "relier" ? RELIER.MIN_PAIRES : MEMORY.MIN_PAIRES)) return NextResponse.json({ error: "Pas assez de cartes." }, { status: 409 });
  const r = await enregistrerSolo({ userId: u.id, groupId: ctx.subject.group_id, subjectId, type, date: await todayParis(subjectId) });
  return NextResponse.json(r);
}
