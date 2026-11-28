"use client";
import { THEME_COOKIE } from "@/config/constants";
import Icon from "./Icon";

/**
 * Bouton clair / sombre de la barre du haut. Le choix est gardé un an dans un cookie, lu par le layout
 * (<html data-theme>) pour que la page arrive déjà dans le bon thème. L'icône est choisie en CSS
 * (--aff-lune / --aff-soleil), donc pas de décalage entre le serveur et le navigateur.
 */
export default function ThemeToggle() {
  const basculer = () => {
    const html = document.documentElement;
    const sombre = html.dataset.theme ? html.dataset.theme === "sombre" : matchMedia("(prefers-color-scheme: dark)").matches;
    const suivant = sombre ? "clair" : "sombre";
    html.dataset.theme = suivant;
    document.cookie = `${THEME_COOKIE}=${suivant}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <button type="button" onClick={basculer} title="Mode clair / sombre" aria-label="Basculer entre le mode clair et le mode sombre"
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-texte-2 transition-colors hover:bg-surface-2 hover:text-texte">
      <span style={{ display: "var(--aff-lune)" }}><Icon name="moon" /></span>
      <span style={{ display: "var(--aff-soleil)" }}><Icon name="sun" /></span>
    </button>
  );
}
