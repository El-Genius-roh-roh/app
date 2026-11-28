import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { submitAnswer, submitMemory } from "@/lib/quiz/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: attemptId } = await params;
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  // Memory du jour : deux cartes retournées ; sinon une réponse à la question en cours
  const r = Array.isArray(body.cartes)
    ? await submitMemory(attemptId, u.id, Number(body.cartes[0]), Number(body.cartes[1]))
    : await submitAnswer(attemptId, u.id, String(body.questionId ?? ""), Number(body.choice));
  return NextResponse.json(r.body, { status: r.status });
}
