import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLink, setSession } from "@/lib/auth";
import { url } from "@/lib/url";

// Redirections relatives : derrière un proxy, req.nextUrl.origin serait l'adresse interne.
const go = (path: string) => new NextResponse(null, { status: 307, headers: { Location: url(path) } });

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const id = await consumeMagicLink(token);
  if (!id) return go("/login?err=1");
  await setSession(id);
  return go("/");
}
