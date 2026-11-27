import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { rejoindre } from "./actions";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  await requireUser();
  const [g] = await q<{ id: string; nom: string }>("select id,nom from groups where code_invitation=$1", [code.toUpperCase()]);
  if (!g) return <main className="p-6">Code invalide.</main>;
  return (
    <main className="mx-auto max-w-sm p-6 space-y-3">
      <h1 className="text-xl font-bold">Rejoindre « {g.nom} » ?</h1>
      <form action={rejoindre}><input type="hidden" name="code" value={code} /><button className="w-full rounded bg-indigo-600 p-2 text-white">Rejoindre</button></form>
    </main>
  );
}
