import { NextRequest, NextResponse } from "next/server";
import { url } from "@/lib/url";

// Formulaire « Rejoindre avec un code » → page de la partie.
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  return new NextResponse(null, { status: 307, headers: { Location: url(code ? `/arene/${code}` : "/arene") } });
}
