"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { url } from "@/lib/url";
import Icon from "@/components/Icon";
import Details from "@/components/Details";

type M = { id: string; titre: string; desc: string };

export default function ArenaCreate({ groupId, modes, dispo }: { groupId: string; modes: M[]; dispo: number }) {
  const router = useRouter();
  const [mode, setMode] = useState("mix");
  const [rounds, setRounds] = useState(8);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setBusy(true); setErr(null);
    const r = await fetch(url("/api/arene"), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create", groupId, mode, rounds }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "Erreur"); return; }
    router.push(`/arene/${j.code}`);
  }

  const choix = (actif: boolean) =>
    `min-h-11 rounded-[12px] border-2 px-2 text-sm font-bold transition-colors ${actif ? "border-accent bg-accent-doux text-accent-fort" : "border-ligne text-texte-2 hover:border-ligne-forte"}`;

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="eyebrow mb-2">Mode</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {modes.map((m) => (
            <button key={m.id} type="button" onClick={() => setMode(m.id)} aria-pressed={mode === m.id} className={choix(mode === m.id)}>{m.titre}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow mb-2">{mode === "course" ? "Manches au maximum" : "Manches"}</legend>
        <div className="grid grid-cols-4 gap-2">
          {[5, 8, 10, 15].map((n) => (
            <button key={n} type="button" onClick={() => setRounds(n)} aria-pressed={rounds === n} className={`num ${choix(rounds === n)}`}>{n}</button>
          ))}
        </div>
      </fieldset>
      <button onClick={create} disabled={busy} className="btn-orange">
        {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-sur-energie/30 border-t-sur-energie" aria-hidden />Création…</> : <><Icon name="plus" size={18} />Créer une partie</>}
      </button>
      <Details>
        <p>{modes.find((m) => m.id === mode)?.desc}</p>
        <p className="mt-1">
          {dispo === 0 ? "Pas encore de question disponible : l'Arène pioche dans les quiz des jours passés." : <><span className="num">{dispo}</span> question{dispo > 1 ? "s" : ""} disponible{dispo > 1 ? "s" : ""} (quiz des jours passés).</>}
        </p>
      </Details>
      {err && <p className="text-sm font-semibold text-ko" role="alert">{err}</p>}
    </div>
  );
}
