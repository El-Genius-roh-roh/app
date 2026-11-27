import { redirect } from "next/navigation";
import { getUser, clearSession } from "@/lib/auth";
import { q } from "@/lib/db";

async function enregistrer(fd: FormData) {
  "use server";
  const u = await getUser();
  if (!u) redirect("/login");
  const pseudo = String(fd.get("pseudo") ?? "").trim().slice(0, 30);
  if (pseudo.length < 2) redirect("/profil?err=1");
  await q("update profiles set pseudo=$1 where id=$2", [pseudo, u.id]);
  redirect("/");
}
async function quitter() { "use server"; await clearSession(); redirect("/login"); }

export default async function Profil() {
  const u = await getUser();
  if (!u) redirect("/login");
  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-xl font-bold">Mon profil</h1>
      <form action={enregistrer} className="space-y-3">
        <input name="pseudo" defaultValue={u.pseudo ?? ""} required minLength={2} placeholder="Pseudo (affiché dans les classements)" className="w-full rounded border p-2" />
        <button className="w-full rounded bg-indigo-600 p-2 text-white">Enregistrer</button>
      </form>
      <form action={quitter}><button className="text-sm text-gray-500 underline">Se déconnecter</button></form>
    </main>
  );
}
