import fs from "fs";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { memberRole } from "@/lib/groups";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getUser();
  if (!u) return new NextResponse("Non connecté", { status: 401 });
  const [p] = await q<{ image_path: string | null; group_id: string }>(
    `select p.image_path,s.group_id from document_pages p join documents d on d.id=p.document_id
       join subjects s on s.id=d.subject_id where p.id=$1`, [id]);
  if (!p?.image_path || !(await memberRole(p.group_id, u.id)) || !fs.existsSync(p.image_path))
    return new NextResponse("Introuvable", { status: 404 });
  return new NextResponse(fs.readFileSync(p.image_path), { headers: { "content-type": "image/png", "cache-control": "private, max-age=3600" } });
}
