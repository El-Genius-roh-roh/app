"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Actualise la page toute seule (nouvelles données du serveur, sans recharger ni perdre ce qui est affiché).
 * En pause quand l'onglet est caché ou pendant la saisie dans un champ ; actualise aussi au retour sur l'onglet.
 */
export default function AutoRefresh({ every = 15000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const occupe = () => {
      const el = document.activeElement;
      return document.hidden || (el instanceof HTMLElement && el.matches("input, textarea, select, [contenteditable]"));
    };
    const t = setInterval(() => { if (!occupe()) router.refresh(); }, every);
    const retour = () => { if (!document.hidden) router.refresh(); };
    document.addEventListener("visibilitychange", retour);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", retour); };
  }, [router, every]);
  return null;
}
