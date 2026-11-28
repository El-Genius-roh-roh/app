import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { accesJeux, MESSAGE_VERROU } from "@/lib/acces";
import { addBot, answerRoom, createRoom, joinRoom, leaveRoom, rollRoom, roomState, startRoom } from "@/lib/plateau/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const r = await roomState(u.id, sp.get("code") ?? "", Number(sp.get("v") ?? -1));
  return NextResponse.json(r.body, { status: r.status });
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const code = String(b.code ?? "");
  // jeux verrouillés tant que le défi du jour n'est pas joué (D45) : on ne bloque que l'entrée dans une partie
  if (["create", "join", "bot", "start"].includes(b.action) && !(await accesJeux(u.id)).ouvert) return NextResponse.json({ error: MESSAGE_VERROU }, { status: 403 });
  let r;
  switch (b.action) {
    case "create": r = await createRoom(u.id, String(b.groupId ?? "")); break;
    case "join": r = await joinRoom(u.id, code); break;
    case "bot": r = await addBot(u.id, code); break;
    case "start": r = await startRoom(u.id, code); break;
    case "roll": r = await rollRoom(u.id, code); break;
    case "answer": r = await answerRoom(u.id, code, b.choice); break;
    case "leave": r = await leaveRoom(u.id, code); break;
    default: r = { status: 400, body: { error: "Action inconnue." } };
  }
  return NextResponse.json(r.body, { status: r.status });
}
