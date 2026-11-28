"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "./Toast";

/** Bouton de copie rapide avec retour visuel et toast. */
export default function CopyButton({ text, label, toastMessage = "Copié dans le presse-papier", className = "" }: {
  text: string;
  label?: string;
  toastMessage?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast(toastMessage, "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Impossible de copier automatiquement", "error");
    }
  }

  return (
    <button type="button" onClick={copy} title="Copier"
      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${className}`}>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
      {label ?? (copied ? "Copié" : "Copier")}
    </button>
  );
}
