"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { url } from "@/lib/url";
import Tex from "./Tex";

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
        <p className="text-2xl font-bold">10 questions, un seul essai</p>
        <button onClick={start} disabled={busy} className="btn-hero">
          {busy ? "Chargement…" : "C'est parti"}
        </button>
        {err && <p className="rounded-2xl bg-white/90 p-2 text-sm font-bold text-rose-600">{err}</p>}
      </div>
    );
  }
  const pct = (st.index / st.total) * 100;
  // lettre de chaque choix (QCM), dans une pastille de couleur douce
  const PASTILLES = ["bg-accent-100 text-accent-700", "bg-orange-100 text-orange-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700"];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="chip bg-white text-slate-700 shadow-sm">{st.index + 1} / {st.total}</span>
        <span className="chip bg-white font-mono text-base text-slate-700 tabular-nums shadow-sm">{fmt(now)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/5"><div className="h-1.5 rounded-full bg-accent-500 transition-all duration-500 ease-(--ease-ios)" style={{ width: `${pct}%` }} /></div>
      <h2 className="card text-xl leading-snug font-semibold break-words"><Tex>{st.question.enonce}</Tex></h2>
      <div className={st.question.type === "vrai_faux" ? "grid grid-cols-2 gap-3" : "space-y-3"}>
        {st.question.choices.map((c, i) => (
          <button key={i} disabled={busy} onClick={() => answer(i)}
            className={`flex w-full items-center gap-3 rounded-[18px] bg-white p-4 text-left text-lg shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_20px_-14px_rgb(0_0_0/0.3)] transition duration-200 ease-(--ease-ios) hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_14px_28px_-16px_rgb(0_0_0/0.35)] active:scale-[0.98] disabled:opacity-60
              ${st.question.type === "vrai_faux" ? `justify-center py-6 text-xl font-semibold ${i === 0 ? "text-emerald-600" : "text-rose-600"}` : ""}`}>
            {st.question.type !== "vrai_faux" && <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${PASTILLES[i % 4]}`}>{"ABCD"[i] ?? i + 1}</span>}
            <Tex className="block min-w-0 break-words">{c}</Tex>
          </button>
        ))}
      </div>
      {err && <p className="text-sm font-bold text-rose-600">{err}</p>}
    </div>
  );
}
