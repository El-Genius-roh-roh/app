import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { submitAnswer } from "@/lib/quiz/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: attemptId } = await params;
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const r = await submitAnswer(attemptId, u.id, String(body.questionId ?? ""), Number(body.choice));
  return NextResponse.json(r.body, { status: r.status });
}
