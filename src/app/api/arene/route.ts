import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { addBot, answerRoom, createRoom, joinRoom, leaveRoom, roomState, startRoom } from "@/lib/arena/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  if (!u.premium) return NextResponse.json({ error: "L'Arène est réservée aux comptes premium." }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const r = await roomState(u.id, sp.get("code") ?? "", Number(sp.get("v") ?? -1));
  return NextResponse.json(r.body, { status: r.status });
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  if (!u.premium) return NextResponse.json({ error: "L'Arène est réservée aux comptes premium." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const code = String(b.code ?? "");
  let r;
  switch (b.action) {
    case "create": r = await createRoom(u.id, String(b.groupId ?? ""), String(b.mode ?? "mix"), Number(b.rounds)); break;
    case "join": r = await joinRoom(u.id, code); break;
    case "bot": r = await addBot(u.id, code); break;
    case "start": r = await startRoom(u.id, code); break;
    case "answer": r = await answerRoom(u.id, code, Number(b.round), b.choice); break;
    case "leave": r = await leaveRoom(u.id, code); break;
    default: r = { status: 400, body: { error: "Action inconnue." } };
  }
  return NextResponse.json(r.body, { status: r.status });
}
