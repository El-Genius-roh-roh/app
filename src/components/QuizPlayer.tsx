"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { url } from "@/lib/url";
import Tex from "./Tex";
import Icon from "./Icon";

type Q = { id: string; type: "qcm" | "vrai_faux"; enonce: string; choices: string[] };
type State = { attemptId: string; index: number; total: number; question: Q; elapsedMs: number };

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const LETTRES = ["A", "B", "C", "D", "E", "F"];

export default function QuizPlayer({ gameDayId, initial }: { gameDayId: string; initial: State | null }) {
  const router = useRouter();
  const [st, setSt] = useState<State | null>(initial);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
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

  // touches 1-4 (ou A-D, V/F) pour répondre au clavier
  useEffect(() => {
    if (!st) return;
    const h = (e: KeyboardEvent) => {
      if (busy || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      let i = Number(k) - 1;
      if (Number.isNaN(i) || i < 0) i = "abcdef".indexOf(k);
      if (st.question.type === "vrai_faux" && (k === "v" || k === "f")) i = k === "v" ? 0 : 1;
      if (i >= 0 && i < st.question.choices.length) answer(i);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

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
    setBusy(true); setErr(null); setPicked(choice);
    const r = await fetch(url(`/api/quiz/${st.attemptId}/answer`), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: st.question.id, choice }),
    });
    const j = await r.json();
    setBusy(false); setPicked(null);
    if (j.done) { router.refresh(); return; }
    if (!r.ok) { setErr(j.error ?? "Erreur"); return; }
    setSt((p) => (p ? { ...p, index: j.index, question: j.question } : p));
  }

  if (!st) {
    return (
      <div className="hero entree space-y-5">
        <div className="space-y-2">
          <p className="eyebrow text-accent">Quiz du jour</p>
          <p className="font-titre text-3xl leading-tight">10 questions, un seul essai</p>
          <ul className="space-y-1.5 text-sm text-texte-2">
            <li className="flex items-center gap-2"><Icon name="clock" size={16} className="text-texte-3" />Le chrono démarre à la première question.</li>
            <li className="flex items-center gap-2"><Icon name="target" size={16} className="text-texte-3" />Classement : d&apos;abord les erreurs, puis le temps.</li>
            <li className="flex items-center gap-2"><Icon name="arrowRight" size={16} className="text-texte-3" />Pas de retour en arrière.</li>
          </ul>
        </div>
        <button onClick={start} disabled={busy} className="btn-primary min-h-13 text-base">
          {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-sur-accent/30 border-t-sur-accent" aria-hidden />Préparation du quiz…</> : <><Icon name="play" size={18} />C&apos;est parti</>}
        </button>
        {err && <p className="text-sm text-ko" role="alert">{err}</p>}
      </div>
    );
  }
  const vf = st.question.type === "vrai_faux";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="num text-sm text-texte-2">Question <b className="text-lg text-texte">{st.index + 1}</b>/{st.total}</span>
        <span className="num inline-flex items-center gap-1.5 rounded-full border border-ligne bg-surface px-3 py-1 text-lg font-bold" aria-label={`Temps écoulé ${fmt(now)}`}>
          <Icon name="clock" size={16} className="text-accent" />{fmt(now)}
        </span>
      </div>
      {/* progression en segments, un par question */}
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: st.total }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < st.index ? "bg-accent" : i === st.index ? "bg-accent/45" : "bg-surface-2"}`} />
        ))}
      </div>
      <h2 key={st.question.id} className="entree card text-xl leading-snug font-semibold break-words lg:text-2xl"><Tex>{st.question.enonce}</Tex></h2>
      <div className={vf ? "grid grid-cols-2 gap-3" : "grid gap-2.5"}>
        {st.question.choices.map((c, i) => {
          const sel = picked === i;
          return (
            <button key={st.question.id + i} disabled={busy} onClick={() => answer(i)}
              className={`group flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-base transition-[border-color,background-color,transform] duration-150 active:translate-y-px disabled:cursor-wait
                ${sel ? "border-accent bg-accent/15" : "border-ligne bg-surface hover:border-accent/60 hover:bg-surface-2"} ${vf ? "justify-center py-6 text-xl font-semibold" : ""}`}>
              {!vf && <span className={`num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${sel ? "border-accent bg-accent text-sur-accent" : "border-ligne text-texte-3 group-hover:border-accent/60 group-hover:text-accent"}`}>{LETTRES[i]}</span>}
              <Tex className="block min-w-0 break-words">{c}</Tex>
            </button>
          );
        })}
      </div>
      <p className="hidden text-center text-xs text-texte-3 lg:block">Astuce : touches {vf ? "V / F" : "1 à 4"} pour répondre</p>
      {err && <p className="text-sm text-ko" role="alert">{err}</p>}
    </div>
  );
}
