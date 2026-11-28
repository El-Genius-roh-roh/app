"use client";
import { useEffect, useRef, useState } from "react";
import { url } from "@/lib/url";
import Icon from "./Icon";

type Reponse = { sessions: number };

/**
 * Fin d'une session solo (flashcards, Memory, Relier) : l'enregistre une seule fois (D37) pour les succès et les défis du jour.
 * Monté sur l'écran de fin : une nouvelle session remonte le composant, donc un nouvel envoi.
 */
export default function RecompenseSolo({ type, subjectId }: { type: "flashcards" | "memory" | "relier"; subjectId: string }) {
  const [r, setR] = useState<Reponse | null>(null);
  const envoye = useRef(false);
  useEffect(() => {
    if (envoye.current) return;
    envoye.current = true;
    fetch(url("/api/solo"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, subjectId }) })
      .then((x) => (x.ok ? x.json() : null)).then(setR).catch(() => undefined);
  }, [type, subjectId]);
  if (!r) return null;
  return (
    <span className="chip border-transparent bg-surface text-texte" aria-live="polite">
      <Icon name="check" size={14} className="text-ok" />Session enregistrée
      <span className="text-texte-3">· <span className="num">{r.sessions}</span> aujourd&apos;hui</span>
    </span>
  );
}
