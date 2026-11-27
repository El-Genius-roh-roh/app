import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { rejoindre } from "./actions";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  await requireUser();
  const [g] = await q<{ id: string; nom: string }>("select id,nom from groups where code_invitation=$1", [code.toUpperCase()]);
  if (!g) return <main className="page max-w-sm"><p className="card font-semibold">Code invalide.</p></main>;
  return (
    <main className="page max-w-sm">
      <div className="hero text-center"><p className="font-semibold text-white/90">Rejoindre le groupe</p><h1 className="text-3xl font-extrabold">{g.nom}</h1></div>
      <form action={rejoindre}><input type="hidden" name="code" value={code} /><button className="btn-primary">C&apos;est parti</button></form>
    </main>
  );
}
