"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const ONGLETS = [
  // deux espaces : Réviser (seul, sans classement en direct : quiz, flashcards, jeux solo) et Arène (compétition entre amis)
  { href: "/", icon: "book", label: "Réviser", actif: (p: string) => p === "/" || p.startsWith("/groupes") || p.startsWith("/matieres") || p.startsWith("/quiz") || p.startsWith("/rejoindre") },
  { href: "/arene", icon: "swords", label: "Arène", actif: (p: string) => p.startsWith("/arene") || p.startsWith("/plateau") },
  { href: "/profil", icon: "user", label: "Profil", actif: (p: string) => p.startsWith("/profil") },
] as const;

/** Téléphone : onglets à portée du pouce (le body réserve leur hauteur, cf. globals.css). */
export default function Onglets() {
  const p = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ligne bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="Onglets">
      <div className="mx-auto grid max-w-md grid-cols-3 px-2">
        {ONGLETS.map((o) => {
          const a = o.actif(p);
          return (
            <Link key={o.href} href={o.href} aria-current={a ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${a ? "text-accent-fort" : "text-texte-3 hover:text-texte"}`}>
              <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${a ? "bg-accent-doux" : ""}`}><Icon name={o.icon} size={21} /></span>
              {o.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Ordinateur : les mêmes destinations dans la barre du haut. */
export function LiensBureau() {
  const p = usePathname();
  return (
    <>
      {ONGLETS.slice(0, 2).map((o) => {
        const a = o.actif(p);
        return (
          <Link key={o.href} href={o.href} aria-current={a ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition-colors max-lg:hidden ${a ? "bg-accent-doux text-accent-fort" : "text-texte-2 hover:bg-surface-2 hover:text-texte"}`}>
            <Icon name={o.icon} size={18} />{o.label}
          </Link>
        );
      })}
    </>
  );
}
