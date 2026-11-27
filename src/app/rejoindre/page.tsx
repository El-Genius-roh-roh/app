import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

async function aller(fd: FormData) {
  "use server";
  redirect(`/rejoindre/${String(fd.get("code") ?? "").trim().toUpperCase()}`);
}

export default async function Page() {
  await requireUser();
  return (
    <main className="mx-auto max-w-sm p-6 space-y-3">
      <h1 className="text-xl font-bold">Rejoindre un groupe</h1>
      <form action={aller} className="space-y-3">
        <input name="code" required maxLength={6} placeholder="Code à 6 caractères" className="w-full rounded border p-2 uppercase tracking-widest" />
        <button className="w-full rounded bg-indigo-600 p-2 text-white">Continuer</button>
      </form>
    </main>
  );
}
