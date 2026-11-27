import fs from "fs";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { avatarFile } from "@/lib/avatar";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getUser())) return new NextResponse("Non connecté", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Introuvable", { status: 404 });
  const f = avatarFile(id);
  if (!fs.existsSync(f)) return new NextResponse("Introuvable", { status: 404 });
  // l'URL contient la version (?v=) : on peut la garder en cache longtemps
  return new NextResponse(fs.readFileSync(f), { headers: { "content-type": "image/webp", "cache-control": "private, max-age=31536000, immutable" } });
}
