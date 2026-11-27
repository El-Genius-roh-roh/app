import Link from "next/link";
import { getUser } from "@/lib/auth";
import { APP_NAME } from "@/config/constants";
import Avatar from "./Avatar";

/** Barre du haut, sur toutes les pages d'un utilisateur connecté (absente de /login). */
export default async function TopBar() {
  const u = await getUser();
  if (!u) return null;
  return (
    <header className="sticky top-0 z-30 border-b border-trait bg-papier/92 backdrop-blur-sm">
      <nav className="mx-auto flex h-14 max-w-md items-center gap-1 px-4 lg:max-w-6xl lg:px-8" aria-label="Navigation principale">
        <Link href="/" className="mr-auto flex items-center gap-2">
          <Logo />
          <span className="font-titre text-[17px] font-extrabold tracking-tight">{APP_NAME}</span>
        </Link>
        <Link href="/" className="rounded-md px-2.5 py-1.5 text-sm font-medium text-encre-2 hover:bg-encre/5 hover:text-encre">Groupes</Link>
        <Link href="/arene" className="rounded-md px-2.5 py-1.5 text-sm font-medium text-encre-2 hover:bg-encre/5 hover:text-encre">Arène</Link>
        <Link href="/profil" className="ml-1 rounded-full" aria-label={`Profil de ${u.pseudo ?? "moi"}`}>
          <Avatar id={u.id} pseudo={u.pseudo ?? "?"} v={u.avatar_v} size={30} />
        </Link>
      </nav>
    </header>
  );
}

/** Marque : un « 1 » de tableau d'affichage dans un carré d'encre, coin orange. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="7" fill="var(--color-encre)" />
      <path d="M20 0h1a7 7 0 0 1 7 7v1z" fill="var(--color-accent)" />
      <path d="M12.2 9.2 15.6 7h1.6v14h-3V11.1l-2 1.2z" fill="var(--color-papier)" />
    </svg>
  );
}
