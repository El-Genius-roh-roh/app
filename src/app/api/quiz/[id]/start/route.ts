import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { startAttempt } from "@/lib/quiz/service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameDayId } = await params;
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const r = await startAttempt(gameDayId, u.id);
  return NextResponse.json(r.body, { status: r.status });
}
