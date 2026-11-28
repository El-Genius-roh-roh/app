import Link from "next/link";
import { getUser } from "@/lib/auth";
import { APP_NAME } from "@/config/constants";
import Avatar from "./Avatar";
import Onglets, { LiensBureau } from "./Onglets";
import { marquerVisite } from "@/lib/tableau";
import ThemeToggle from "./ThemeToggle";

/**
 * Navigation : barre du haut (marque + profil) et, sur téléphone, barre d'onglets en bas (pouce).
 * Absente tant qu'on n'est pas connecté (/login).
 */
export default async function TopBar() {
  const u = await getUser();
  if (!u) return null;
  await marquerVisite(u.id).catch(() => undefined); // succès « fidèle » (D38) : jamais bloquant pour l'affichage
  return (
    <>
      <header className="sticky top-0 z-30 border-b-2 border-ligne bg-fond/90 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-md items-center gap-1 px-4 lg:max-w-6xl lg:px-8" aria-label="Navigation principale">
          <Link href="/" className="mr-auto flex min-h-11 items-center gap-2.5">
            <Logo />
            <span className="font-titre text-lg font-extrabold tracking-tight">{APP_NAME}</span>
          </Link>
          <LiensBureau />
          <ThemeToggle />
          <Link href="/profil" className="ml-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full" aria-label={`Profil de ${u.pseudo ?? "moi"}`}>
            <Avatar id={u.id} pseudo={u.pseudo ?? "?"} v={u.avatar_v} size={36} />
          </Link>
        </nav>
      </header>
      <Onglets />
    </>
  );
}

/** Marque : un « 1 » blanc sur un jeton bleu à socle. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect y="3" width="32" height="29" rx="9" fill="var(--color-accent-ombre)" />
      <rect width="32" height="29" rx="9" fill="var(--color-accent)" />
      <circle cx="25" cy="7" r="3" fill="var(--color-or-vif)" />
      <path d="M13.6 9.6 17.4 7.2h2v15h-3.4V11.4l-2.4 1.4z" fill="var(--color-sur-accent)" />
    </svg>
  );
}
