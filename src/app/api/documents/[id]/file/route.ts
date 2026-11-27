import fs from "fs";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getUser();
  if (!u) return new NextResponse("Non connecté", { status: 401 });
  const [d] = await q<{ fichier_path: string; nom: string; group_id: string }>(
    "select d.fichier_path,d.nom,s.group_id from documents d join subjects s on s.id=d.subject_id where d.id=$1", [id]);
  if (!d || !(await memberRole(d.group_id, u.id)) || !fs.existsSync(d.fichier_path)) return new NextResponse("Introuvable", { status: 404 });
  return new NextResponse(fs.readFileSync(d.fichier_path), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${encodeURIComponent(d.nom)}"` },
  });
}
