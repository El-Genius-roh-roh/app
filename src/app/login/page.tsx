import { redirect } from "next/navigation";
import { createMagicLink } from "@/lib/auth";
import { APP_NAME } from "@/config/constants";
import { url } from "@/lib/url";

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
    <main className="page max-w-sm pt-16">
      <div className="hero text-center">
        <div className="text-5xl">🧠</div>
        <h1 className="mt-2 text-3xl font-extrabold">{APP_NAME}</h1>
        <p className="mt-1 font-semibold text-white/90">Révise chaque jour, bats tes amis.</p>
      </div>
      <div className="card space-y-3">
        {token ? (
          <a className="btn-primary" href={url(`/auth/verify?token=${token}`)}>Se connecter</a>
        ) : (
          <form action={demander} className="space-y-3">
            <input name="email" type="email" required placeholder="ton@email.fr" className="input" />
            {err && <p className="text-sm font-semibold text-rose-600">E-mail invalide.</p>}
            <button className="btn-primary">Recevoir mon lien</button>
          </form>
        )}
      </div>
    </main>
  );
}
