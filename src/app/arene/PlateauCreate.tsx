"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { url } from "@/lib/url";
import Icon from "@/components/Icon";
import Details from "@/components/Details";

/** Crée une partie de jeu de plateau pour le groupe puis ouvre son salon. */
export default function PlateauCreate({ groupId, themes }: { groupId: string; themes: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setBusy(true); setErr(null);
    const r = await fetch(url("/api/plateau"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create", groupId }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "Erreur"); return; }
    router.push(`/plateau/${j.code}`);
  }

  return (
    <div className="space-y-3">
      <button onClick={create} disabled={busy || !themes.length} className="btn-white">
        {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" aria-hidden />Création…</> : <><Icon name="plus" size={18} />Créer un jeu de plateau</>}
      </button>
      <Details>
        {themes.length
          ? <>Thèmes des cases : <b className="text-texte-2">{themes.join(", ")}</b>. Lance le dé, réponds juste pour avancer.</>
          : "Pas encore de question disponible : le plateau pioche dans les quiz des jours passés."}
      </Details>
      {err && <p className="text-sm font-semibold text-ko" role="alert">{err}</p>}
    </div>
  );
}
