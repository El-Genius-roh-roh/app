"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { url } from "@/lib/url";

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

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {modes.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} title={m.desc}
            className={`rounded-lg border-2 p-2 text-xs ${mode === m.id ? "border-accent-600 bg-accent-50 text-accent-700" : "border-gray-200"}`}>
            {m.titre}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">{modes.find((m) => m.id === mode)?.desc}</p>
      <div className="flex items-center gap-2 text-sm">
        Manches
        {[5, 8, 10, 15].map((n) => (
          <button key={n} onClick={() => setRounds(n)} className={`rounded border px-2 py-1 ${rounds === n ? "bg-accent-600 text-white" : ""}`}>{n}</button>
        ))}
      </div>
      <button onClick={create} disabled={busy} className="w-full rounded-lg bg-accent-600 p-2 text-white disabled:opacity-50">
        {busy ? "Création…" : "Créer une partie"}
      </button>
      <p className="text-xs text-gray-400">{dispo} question(s) disponible(s) (quiz des jours passés).</p>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
