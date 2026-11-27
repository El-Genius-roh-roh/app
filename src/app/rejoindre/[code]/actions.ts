"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { joinGroup } from "@/lib/groups";

export async function rejoindre(fd: FormData) {
  const u = await requireUser();
  const [g] = await q<{ id: string }>("select id from groups where code_invitation=$1", [String(fd.get("code") ?? "").toUpperCase()]);
  if (!g) redirect("/rejoindre");
  await joinGroup(g.id, u.id);
  redirect(`/groupes/${g.id}`);
}
