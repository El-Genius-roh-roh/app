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
      <div className="hero space-y-4 text-center">
        <p className="text-6xl">🧠</p>
        <p className="text-2xl font-extrabold">10 questions, un seul essai</p>
        <button onClick={start} disabled={busy} className="btn bg-white text-xl text-fuchsia-600 shadow-lg">
          {busy ? "Chargement…" : "▶ C'est parti"}
        </button>
        {err && <p className="rounded-2xl bg-white/90 p-2 text-sm font-bold text-rose-600">{err}</p>}
      </div>
    );
  }
  const pct = (st.index / st.total) * 100;
  const COULEURS = ["from-violet-500 to-fuchsia-500", "from-orange-500 to-amber-400", "from-sky-500 to-cyan-400", "from-emerald-500 to-lime-500"];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="chip bg-white text-violet-700 shadow-sm">{st.index + 1} / {st.total}</span>
        <span className="chip bg-white font-mono text-base text-fuchsia-600 shadow-sm">⏱ {fmt(now)}</span>
      </div>
      <div className="h-3 rounded-full bg-white shadow-inner"><div className="h-3 rounded-full bg-gradient-to-r from-violet-500 to-orange-400 transition-all" style={{ width: `${pct}%` }} /></div>
      <h2 className="card text-xl font-extrabold leading-snug">{st.question.enonce}</h2>
      <div className={st.question.type === "vrai_faux" ? "grid grid-cols-2 gap-3" : "space-y-3"}>
        {st.question.choices.map((c, i) => (
          <button key={i} disabled={busy} onClick={() => answer(i)}
            className={`w-full rounded-2xl bg-gradient-to-r ${st.question.type === "vrai_faux" ? (i === 0 ? COULEURS[3] : "from-rose-500 to-pink-400") : COULEURS[i % 4]} p-4 text-left text-lg font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60 ${st.question.type === "vrai_faux" ? "py-6 text-center text-xl" : ""}`}>
            {c}
          </button>
        ))}
      </div>
      {err && <p className="text-sm font-bold text-rose-600">{err}</p>}
    </div>
  );
}
