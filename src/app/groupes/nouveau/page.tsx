import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { genCode, joinGroup } from "@/lib/groups";

async function creer(fd: FormData) {
  "use server";
  const u = await requireUser();
  const nom = String(fd.get("nom") ?? "").trim().slice(0, 60);
  if (!nom) redirect("/groupes/nouveau");
  const [g] = await q<{ id: string }>("insert into groups(nom,code_invitation,created_by) values ($1,$2,$3) returning id", [nom, genCode(), u.id]);
  await joinGroup(g.id, u.id, "admin");
  redirect(`/groupes/${g.id}`);
}

export default async function Page() {
  await requireUser();
  return (
    <main className="page max-w-sm">
      <Link href="/" className="back">Accueil</Link>
      <h1 className="title">Nouveau groupe</h1>
      <form action={creer} className="card space-y-3">
        <input name="nom" required placeholder="Nom du groupe (ex. Promo 2027)" className="input" />
        <button className="btn-primary">Créer</button>
      </form>
    </main>
  );
}
