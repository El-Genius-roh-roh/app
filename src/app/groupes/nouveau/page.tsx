import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { genCode, joinGroup } from "@/lib/groups";
import Icon from "@/components/Icon";

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
    <main className="page lg:max-w-md">
      <Link href="/" className="back"><Icon name="arrowLeft" size={16} />Accueil</Link>
      <header className="entree">
        <h1 className="title">Nouveau groupe</h1>
        <p className="mt-2 text-texte-2">Un groupe = tes amis + vos matières. Tu recevras un code à leur partager.</p>
      </header>
      <form action={creer} className="card space-y-3">
        <label htmlFor="nom" className="block text-sm font-bold">Nom du groupe</label>
        <input id="nom" name="nom" required maxLength={60} placeholder="ex. Promo 2027" autoComplete="off" className="input" />
        <button className="btn-primary"><Icon name="plus" size={18} />Créer le groupe</button>
      </form>
    </main>
  );
}
