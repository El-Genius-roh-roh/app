import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import Icon from "@/components/Icon";
import { rejoindre } from "./actions";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  await requireUser();
  const [g] = await q<{ id: string; nom: string; membres: number }>(
    "select g.id, g.nom, (select count(*)::int from group_members m where m.group_id=g.id) as membres from groups g where code_invitation=$1", [code.toUpperCase()]);
  if (!g) return (
    <main className="page lg:max-w-md">
      <div className="card space-y-3">
        <p className="font-bold">Aucun groupe avec le code « {code.toUpperCase()} »</p>
        <p className="muted">Vérifie le code auprès d&apos;un membre du groupe : 6 caractères, lettres et chiffres.</p>
        <Link href="/rejoindre" className="btn-white">Saisir un autre code</Link>
      </div>
    </main>
  );
  return (
    <main className="page lg:max-w-md">
      <section className="hero entree text-center">
        <p className="eyebrow">Invitation</p>
        <h1 className="mt-2 font-titre text-4xl leading-tight font-extrabold break-words">{g.nom}</h1>
        <p className="mt-2 text-sm opacity-90"><span className="num">{g.membres}</span> membre{g.membres > 1 ? "s" : ""} t&apos;attendent</p>
        <form action={rejoindre} className="mt-6">
          <input type="hidden" name="code" value={code} />
          <button className="btn-hero w-full"><Icon name="users" size={20} />Rejoindre le groupe</button>
        </form>
      </section>
      <Link href="/" className="back mx-auto flex justify-center">Pas maintenant</Link>
    </main>
  );
}
