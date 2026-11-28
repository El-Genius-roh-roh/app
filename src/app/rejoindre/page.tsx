import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import Icon from "@/components/Icon";

async function aller(fd: FormData) {
  "use server";
  redirect(`/rejoindre/${String(fd.get("code") ?? "").trim().toUpperCase()}`);
}

export default async function Page() {
  await requireUser();
  return (
    <main className="page lg:max-w-md">
      <Link href="/" className="back"><Icon name="arrowLeft" size={16} />Accueil</Link>
      <header className="entree">
        <h1 className="title">Rejoindre un groupe</h1>
        <p className="mt-2 text-texte-2">Demande le code d&apos;invitation à un membre : il le trouve sur la page de son groupe.</p>
      </header>
      <form action={aller} className="card space-y-3">
        <label htmlFor="code" className="block text-sm font-bold">Code d&apos;invitation</label>
        <input id="code" name="code" required maxLength={6} placeholder="ABC123" autoComplete="off" autoCapitalize="characters"
          className="input num text-center text-2xl font-semibold tracking-[0.4em] uppercase" />
        <button className="btn-primary">Voir le groupe<Icon name="arrowRight" size={18} /></button>
      </form>
    </main>
  );
}
