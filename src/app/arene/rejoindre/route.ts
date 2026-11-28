import { NextRequest, NextResponse } from "next/server";
import { url } from "@/lib/url";
import { estPlateau } from "@/lib/plateau/service";

// Formulaire « Rejoindre avec un code » → page de la partie (Arène ou jeu de plateau : un code ne désigne qu'une partie).
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  const dest = !code ? "/arene" : (await estPlateau(code)) ? `/plateau/${code}` : `/arene/${code}`;
  return new NextResponse(null, { status: 307, headers: { Location: url(dest) } });
}
