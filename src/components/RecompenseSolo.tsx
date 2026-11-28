"use client";
import { useEffect, useRef, useState } from "react";
import { url } from "@/lib/url";
import { GemmeIcone } from "./Trophees";

type Reponse = { gagne: number; aujourdhui: number; max: number };

/**
 * Fin d'une session solo (flashcards, Memory) : l'enregistre une seule fois (D37) et affiche les gemmes solo gagnées.
 * Monté sur l'écran de fin : une nouvelle session remonte le composant, donc un nouvel envoi.
 */
export default function RecompenseSolo({ type, subjectId }: { type: "flashcards" | "memory"; subjectId: string }) {
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
      <GemmeIcone size={14} />
      {r.gagne > 0 ? <>+<span className="num">{r.gagne}</span> gemmes pour ta semaine</> : <>Plafond solo du jour atteint</>}
      <span className="text-texte-3">· <span className="num">{r.aujourdhui}/{r.max}</span> aujourd&apos;hui</span>
    </span>
  );
}
