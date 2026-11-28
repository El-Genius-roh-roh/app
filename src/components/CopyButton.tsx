"use client";
import { useCallback, useState } from "react";
import Icon from "./Icon";

/** Bouton « copier » : copie `text` dans le presse-papier, montre une coche pendant 1,8 s. */
export default function CopyButton({ text, label = "Copier le code", className = "" }: { text: string; label?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* fallback : ignoré */ }
    setOk(true);
    setTimeout(() => setOk(false), 1800);
  }, [text]);
  return (
    <button type="button" onClick={copy} aria-label={ok ? "Copié !" : label}
      className={`inline-flex items-center justify-center rounded-[10px] p-1.5 text-texte-3 transition-colors hover:bg-surface-2 hover:text-texte active:scale-95 ${className}`}>
      <Icon name={ok ? "check" : "copy"} size={17} className={ok ? "text-ok" : ""} />
    </button>
  );
}
