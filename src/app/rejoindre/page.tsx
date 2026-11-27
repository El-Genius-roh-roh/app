import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

async function aller(fd: FormData) {
  "use server";
  redirect(`/rejoindre/${String(fd.get("code") ?? "").trim().toUpperCase()}`);
}

export default async function Page() {
  await requireUser();
  return (
    <main className="page max-w-sm">
      <Link href="/" className="back">Accueil</Link>
      <h1 className="title">Rejoindre un groupe</h1>
      <form action={aller} className="card space-y-3">
        <input name="code" required maxLength={6} placeholder="CODE" className="input text-center text-2xl font-bold uppercase tracking-[0.4em]" />
        <button className="btn-primary">Continuer</button>
      </form>
    </main>
  );
}
