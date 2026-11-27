"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { url } from "@/lib/url";

type Q = { id: string; type: "qcm" | "vrai_faux"; enonce: string; choices: string[] };
type State = { attemptId: string; index: number; total: number; question: Q; elapsedMs: number };

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function QuizPlayer({ gameDayId, initial }: { gameDayId: string; initial: State | null }) {
  const router = useRouter();
  const [st, setSt] = useState<State | null>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(initial?.elapsedMs ?? 0);
  const t0 = useRef(0);

  useEffect(() => {
    if (!st) return;
    const base = st.elapsedMs;
    t0.current = performance.now();
    setNow(base);
    const i = setInterval(() => setNow(base + performance.now() - t0.current), 250);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.attemptId]);

  async function start() {
    setBusy(true); setErr(null);
    const r = await fetch(url(`/api/quiz/${gameDayId}/start`), { method: "POST" });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "Erreur"); if (r.status === 409 || r.status === 403) router.refresh(); return; }
    setSt(j);
  }

  async function answer(choice: number) {
    if (!st || busy) return;
    setBusy(true); setErr(null);
    const r = await fetch(url(`/api/quiz/${st.attemptId}/answer`), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: st.question.id, choice }),
    });
    const j = await r.json();
    setBusy(false);
    if (j.done) { router.refresh(); return; }
    if (!r.ok) { setErr(j.error ?? "Erreur"); return; }
    setSt((p) => (p ? { ...p, index: j.index, question: j.question } : p));
  }

  if (!st) {
    return (
      <div className="space-y-3">
        <button onClick={start} disabled={busy} className="w-full rounded bg-indigo-600 p-3 text-lg font-semibold text-white disabled:opacity-50">
          {busy ? "Chargement…" : "Commencer le quiz"}
        </button>
        <p className="text-xs text-gray-500">10 questions, une seule tentative. Le chronomètre démarre à la première question ; pas de retour en arrière.</p>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    );
  }
  const pct = (st.index / st.total) * 100;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span>Question {st.index + 1} / {st.total}</span>
        <span className="font-mono text-lg">{fmt(now)}</span>
      </div>
      <div className="h-2 rounded bg-gray-200"><div className="h-2 rounded bg-indigo-600 transition-all" style={{ width: `${pct}%` }} /></div>
      <h2 className="text-lg font-semibold">{st.question.enonce}</h2>
      <div className={st.question.type === "vrai_faux" ? "grid grid-cols-2 gap-3" : "space-y-2"}>
        {st.question.choices.map((c, i) => (
          <button key={i} disabled={busy} onClick={() => answer(i)}
            className="w-full rounded border-2 border-indigo-200 p-3 text-left active:bg-indigo-100 disabled:opacity-50">
            {c}
          </button>
        ))}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
