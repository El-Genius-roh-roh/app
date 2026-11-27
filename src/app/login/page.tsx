import { redirect } from "next/navigation";
import { createMagicLink } from "@/lib/auth";
import { APP_NAME } from "@/config/constants";

async function demander(fd: FormData) {
  "use server";
  const email = String(fd.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) redirect("/login?err=1");
  const token = await createMagicLink(email);
  redirect(`/login?token=${token}`);
}

export default async function Login({ searchParams }: { searchParams: Promise<{ token?: string; err?: string }> }) {
  const { token, err } = await searchParams;
  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-bold">{APP_NAME}</h1>
      <p className="text-gray-600">Connexion par lien magique.</p>
      {token ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
          <p>Mode démo : aucun e-mail n&apos;est envoyé. Cliquez sur le lien :</p>
          <a className="block rounded bg-indigo-600 p-2 text-center text-white" href={`/auth/verify?token=${token}`}>Se connecter</a>
        </div>
      ) : (
        <form action={demander} className="space-y-3">
          <input name="email" type="email" required placeholder="ton@email.fr" className="w-full rounded border p-2" />
          {err && <p className="text-red-600 text-sm">E-mail invalide.</p>}
          <button className="w-full rounded bg-indigo-600 p-2 text-white">Recevoir mon lien</button>
        </form>
      )}
    </main>
  );
}
