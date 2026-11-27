import Link from "next/link";
import { getUser } from "@/lib/auth";
import { APP_NAME } from "@/config/constants";
import Avatar from "./Avatar";
import Icon from "./Icon";

/**
 * Navigation : barre du haut (marque + profil) et, sur téléphone, barre d'onglets en bas (pouce).
 * Absente tant qu'on n'est pas connecté (/login).
 */
export default async function TopBar() {
  const u = await getUser();
  if (!u) return null;
  const lien = "inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-texte-2 transition-colors hover:bg-surface-2 hover:text-texte";
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ligne bg-fond/90 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-md items-center gap-1 px-4 lg:max-w-6xl lg:px-8" aria-label="Navigation principale">
          <Link href="/" className="mr-auto flex min-h-11 items-center gap-2.5">
            <Logo />
            <span className="font-titre text-[17px] tracking-wide">{APP_NAME}</span>
          </Link>
          <Link href="/" className={`${lien} max-lg:hidden`}><Icon name="home" size={18} />Groupes</Link>
          <Link href="/arene" className={`${lien} max-lg:hidden`}><Icon name="swords" size={18} />Arène</Link>
          <Link href="/profil" className="ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full" aria-label={`Profil de ${u.pseudo ?? "moi"}`}>
            <Avatar id={u.id} pseudo={u.pseudo ?? "?"} v={u.avatar_v} size={32} />
          </Link>
        </nav>
      </header>
      {/* téléphone : onglets à portée du pouce (le body réserve leur hauteur en bas, cf. globals.css) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ligne bg-fond/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="Onglets">
        <div className="mx-auto grid max-w-md grid-cols-3">
          <Onglet href="/" icon="home" label="Groupes" />
          <Onglet href="/arene" icon="swords" label="Arène" />
          <Onglet href="/profil" icon="user" label="Profil" />
        </div>
      </nav>
    </>
  );
}

function Onglet({ href, icon, label }: { href: string; icon: "home" | "swords" | "user"; label: string }) {
  return (
    <Link href={href} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-texte-2 transition-colors hover:text-texte">
      <Icon name={icon} size={22} />
      {label}
    </Link>
  );
}

/** Marque : un « 1 » de tableau d'affichage, coin bleu. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="8" fill="var(--color-surface-2)" stroke="var(--color-ligne)" />
      <path d="M20 0h0a8 8 0 0 1 8 8v0z" fill="var(--color-accent)" />
      <path d="M12.2 9.2 15.6 7h1.6v14h-3V11.1l-2 1.2z" fill="var(--color-texte)" />
    </svg>
  );
}
