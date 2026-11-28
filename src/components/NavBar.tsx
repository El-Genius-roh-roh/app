"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Moon, Sun, Swords, User } from "lucide-react";
import { APP_NAME } from "@/config/constants";

const LINKS = [
  { href: "/", label: "Accueil", icon: Home, match: (p: string) => p === "/" || p.startsWith("/groupes") || p.startsWith("/matieres") },
  { href: "/arene", label: "Arène", icon: Swords, match: (p: string) => p.startsWith("/arene") },
  { href: "/profil", label: "Profil", icon: User, match: (p: string) => p.startsWith("/profil") },
];

/** Barre de navigation globale (en-tête desktop + tab bar mobile iOS) avec sélecteur de thème clair/sombre. */
export default function NavBar() {
  const pathname = usePathname() || "/";
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : sysDark;
    setDark(isDark);
    if (saved) document.documentElement.dataset.theme = saved;
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    const val = next ? "dark" : "light";
    document.documentElement.dataset.theme = val;
    localStorage.setItem("theme", val);
  }

  // Masquer la navigation sur les pages immersives ou d'authentification
  if (pathname.startsWith("/login") || pathname.startsWith("/quiz/") || /^\/arene\/[^/]+$/.test(pathname)) {
    return null;
  }

  return (
    <>
      {/* Barre supérieure desktop */}
      <header className="sticky top-0 z-40 hidden border-b border-black/5 bg-[var(--bg-glass)] backdrop-blur-xl lg:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-3">
          <Link href="/" className="font-titre text-lg font-bold tracking-tight text-accent-600">{APP_NAME}</Link>
          <nav className="flex items-center gap-1" aria-label="Navigation principale">
            {LINKS.map((l) => {
              const active = l.match(pathname);
              const Icon = l.icon;
              return (
                <Link key={l.href} href={l.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${active ? "bg-accent-50 text-accent-700" : "text-slate-600 hover:bg-black/5"}`}>
                  <Icon className="h-4 w-4" />
                  {l.label}
                </Link>
              );
            })}
            <button type="button" onClick={toggleTheme} aria-label={dark ? "Passer en thème clair" : "Passer en thème sombre"}
              className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-black/5">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </nav>
        </div>
      </header>

      {/* Tab Bar flottante iOS sur mobile */}
      <nav aria-label="Navigation mobile"
        className="verre fixed inset-x-4 bottom-3 z-40 flex items-center justify-around rounded-[24px] px-2 py-1.5 lg:hidden">
        {LINKS.map((l) => {
          const active = l.match(pathname);
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition ${active ? "text-accent-600" : "text-slate-500"}`}>
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.3]" : ""}`} />
              <span>{l.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={toggleTheme} aria-label={dark ? "Passer en thème clair" : "Passer en thème sombre"}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold text-slate-500 transition">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span>{dark ? "Clair" : "Sombre"}</span>
        </button>
      </nav>
    </>
  );
}
