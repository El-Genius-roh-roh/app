import crypto from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createMagicLink } from "@/lib/auth";
import { mailConfigured, sendLoginMail } from "@/lib/mail";
import { APP_NAME } from "@/config/constants";
import { url } from "@/lib/url";
import Icon from "@/components/Icon";
import { Logo } from "@/components/TopBar";

/**
 * Comment le lien de connexion arrive à l'utilisateur :
 * - « mail »    : un vrai e-mail (RESEND_API_KEY + MAIL_FROM configurés) — le seul mode sûr pour un usage réel ;
 * - « ecran »   : affiché directement à l'écran, UNIQUEMENT en mode démo (DEMO_MODE=1) ;
 * - « console » : sinon, écrit dans la console du serveur (développement).
 * CODE_ACCES (facultatif) : code à saisir en plus de l'e-mail, pour réserver l'app à ceux qui le connaissent
 * (indispensable si l'app est exposée publiquement en mode démo).
 */
const mode = (): "mail" | "ecran" | "console" =>
  mailConfigured() ? "mail" : process.env.DEMO_MODE === "1" ? "ecran" : "console";

const codeOk = (saisi: string) => {
  const attendu = process.env.CODE_ACCES;
  if (!attendu) return true;
  const a = Buffer.from(saisi.trim()), b = Buffer.from(attendu);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

async function demander(fd: FormData) {
  "use server";
  const email = String(fd.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) redirect("/login?err=email");
  if (!codeOk(String(fd.get("code") ?? ""))) redirect("/login?err=code");
  const token = await createMagicLink(email);
  const m = mode();
  if (m === "ecran") redirect(`/login?token=${token}`);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const link = `${proto}://${host}${url(`/auth/verify?token=${token}`)}`;
  if (m === "mail") {
    let ok = true;
    try { await sendLoginMail(email, link); } catch (e) { ok = false; console.error("login", (e as Error).message); }
    if (!ok) redirect("/login?err=mail");
  } else {
    console.log(`[connexion] lien pour ${email} : ${link}`);
  }
  redirect(`/login?envoye=${m}`);
}

const ERREURS: Record<string, string> = {
  email: "E-mail invalide.",
  code: "Code d'accès incorrect.",
  mail: "L'e-mail n'a pas pu être envoyé, réessaie dans un instant.",
  "1": "Lien invalide ou expiré : demande-en un nouveau.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ token?: string; err?: string; envoye?: string }> }) {
  const { token, err, envoye } = await searchParams;
  // le bouton n'apparaît qu'en mode démo : ailleurs, un ?token= dans l'URL est ignoré
  const montrer = token && mode() === "ecran";
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <div className="entree space-y-4">
        <Logo size={44} />
        <h1 className="font-titre text-4xl leading-tight">{APP_NAME}</h1>
        <p className="text-lg text-texte-2">10 questions par jour sur tes cours. Le plus juste et le plus rapide prend la tête du classement.</p>
      </div>
      <div className="card space-y-4">
        {montrer ? (
          <>
            <p className="text-sm text-texte-2">Mode démo : aucun e-mail n&apos;est envoyé, ton lien est prêt.</p>
            <a className="btn-primary" href={url(`/auth/verify?token=${token}`)}>Se connecter<Icon name="arrowRight" size={18} /></a>
          </>
        ) : envoye ? (
          <p className="text-sm text-texte-2" role="status">
            {envoye === "mail"
              ? "C'est envoyé ! Ouvre l'e-mail et clique sur le lien (valable 15 minutes)."
              : "Aucun service d'e-mail n'est configuré : le lien de connexion a été écrit dans la console du serveur."}
          </p>
        ) : (
          <form action={demander} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-texte-2">Adresse e-mail</span>
              <input name="email" type="email" required autoComplete="email" inputMode="email" placeholder="prenom.nom@ecole.fr" className="input"
                aria-invalid={err === "email" || undefined} />
            </label>
            {process.env.CODE_ACCES && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-texte-2">Code d&apos;accès</span>
                <input name="code" required autoComplete="off" className="input num tracking-[0.2em] uppercase" aria-invalid={err === "code" || undefined} />
              </label>
            )}
            {err && <p className="text-sm font-medium text-ko" role="alert">{ERREURS[err] ?? "Erreur."}</p>}
            <button className="btn-primary">Recevoir mon lien de connexion</button>
          </form>
        )}
      </div>
    </main>
  );
}
