"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { url } from "@/lib/url";
import Tex from "./Tex";
import Icon from "./Icon";
import { FORMATS, type Format } from "@/lib/quiz/formats";
import Details from "./Details";
import MemoryDefi from "./MemoryDefi";
import type { MemoryState } from "@/lib/quiz/service";

type Q = { id: string; type: "qcm" | "vrai_faux"; mode: "qcm" | "vf" | "relier"; enonce: string; choices: string[]; proposition?: string; restantes?: string[] };
type State = { attemptId: string; format: Format; index: number; total: number; question: Q; elapsedMs: number; memory?: MemoryState };

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const LETTRES = ["A", "B", "C", "D", "E", "F"];

/** Jeu du jour (D46) : QCM, Mort subite et Relier ont le même déroulé (une question à la fois, validée par le serveur) ; le Memory a son plateau. */
export default function QuizPlayer({ gameDayId, initial, format }: { gameDayId: string; initial: State | null; format: Format }) {
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
    if (!st || st.format === "memory") return;
    const h = (e: KeyboardEvent) => {
      if (busy || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      let i = Number(k) - 1;
      if (Number.isNaN(i) || i < 0) i = st.question.mode === "relier" ? -1 : "abcdef".indexOf(k);
      if ((st.question.type === "vrai_faux" || st.question.mode === "vf") && (k === "v" || k === "f")) i = k === "v" ? 0 : 1;
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
        <div className="space-y-3">
          <p className="eyebrow">Jeu du jour · {FORMATS[format].titre}</p>
          <p className="flex items-center gap-3 font-titre text-4xl leading-[1.02] font-extrabold"><Icon name={FORMATS[format].icone} size={34} />{FORMATS[format].titre}</p>
          <p className="text-[15px] opacity-95">{FORMATS[format].consigne}</p>
          <ul className="space-y-2 text-[15px]">
            <li className="flex items-center gap-2.5"><Icon name="flame" size={18} className="opacity-80" />Un seul essai : il compte pour le classement du jour.</li>
            <li className="flex items-center gap-2.5"><Icon name="clock" size={18} className="opacity-80" />Le chrono démarre dès que tu lances le jeu.</li>
            <li className="flex items-center gap-2.5"><Icon name="target" size={18} className="opacity-80" />{FORMATS[format].classement}</li>
            {format !== "memory" && <li className="flex items-center gap-2.5"><Icon name="arrowRight" size={18} className="opacity-80" />Pas de retour en arrière.</li>}
          </ul>
        </div>
        <button onClick={start} disabled={busy} className="btn-hero">
          {busy ? <><span className="h-5 w-5 animate-spin rounded-full border-[3px] border-accent/25 border-t-accent" aria-hidden />Préparation du quiz…</> : <><Icon name="play" size={20} />C&apos;est parti</>}
        </button>
        {err && <p className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-ko" role="alert">{err}</p>}
      </div>
    );
  }
  if (st.format === "memory" && st.memory) return <MemoryDefi initial={{ attemptId: st.attemptId, elapsedMs: st.elapsedMs, total: st.total, memory: st.memory }} />;
  const mode = st.question.mode;
  const vf = st.question.type === "vrai_faux" || mode === "vf";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="num text-sm text-texte-2">Question <b className="text-lg text-texte">{st.index + 1}</b>/{st.total}
          {st.format === "mort_subite" && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-energie-doux px-2 py-0.5 text-xs font-bold text-energie"><Icon name="flame" size={12} />Mort subite</span>}</span>
        <span className="num inline-flex items-center gap-1.5 rounded-full border-2 border-ligne bg-surface px-3 py-1 text-lg font-semibold" aria-label={`Temps écoulé ${fmt(now)}`}>
          <Icon name="clock" size={16} className="text-accent" />{fmt(now)}
        </span>
      </div>
      {/* progression en segments, un par question */}
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: st.total }, (_, i) => (
          <span key={i} className={`h-2.5 flex-1 rounded-full transition-colors ${i < st.index ? "bg-accent" : i === st.index ? "bg-accent/40" : "bg-ligne"}`} />
        ))}
      </div>
      <h2 key={st.question.id} className="entree py-2 font-sans text-[22px] leading-snug font-bold tracking-normal break-words lg:text-3xl"><Tex>{st.question.enonce}</Tex></h2>
      {mode === "vf" && st.question.proposition !== undefined && (
        <div key={st.question.id + "p"} className="entree rounded-[16px] border-2 border-dashed border-energie/50 bg-energie-doux px-4 py-3">
          <p className="text-[13px] font-semibold text-energie">Réponse proposée</p>
          <p className="text-lg font-bold break-words"><Tex>{st.question.proposition}</Tex></p>
        </div>
      )}
      {mode === "relier" && (
        <p className="flex items-center gap-2 text-sm font-semibold text-texte-2">
          <Icon name="share" size={16} className="text-accent" />Choisis sa réponse dans la réserve
          <span className="ml-auto text-texte-3">encore <span className="num">{st.question.restantes?.length ?? 0}</span> à relier</span>
        </p>
      )}
      <div className={vf ? "grid grid-cols-2 gap-3" : mode === "relier" ? "grid gap-2 sm:grid-cols-2" : "grid gap-2.5"}>
        {st.question.choices.map((c, i) => {
          const sel = picked === i;
          return (
            <button key={st.question.id + i} disabled={busy} onClick={() => answer(i)}
              className={`group flex min-h-15 w-full items-center gap-3 rounded-[16px] border-2 px-4 py-3 text-left text-base font-medium transition-[border-color,background-color,transform,box-shadow] duration-100 active:translate-y-[3px] active:shadow-none disabled:cursor-wait
                ${sel ? "translate-y-[3px] border-accent bg-accent-doux shadow-none" : "border-ligne bg-surface shadow-[0_3px_0_var(--color-ligne)] hover:border-accent hover:shadow-[0_3px_0_var(--color-accent)]"} ${vf ? "justify-center py-7 text-xl font-bold" : ""}`}>
              {!vf && mode !== "relier" && <span className={`num flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-2 text-sm font-semibold ${sel ? "border-accent bg-accent text-sur-accent" : "border-ligne text-texte-3 group-hover:border-accent group-hover:text-accent-fort"}`}>{LETTRES[i]}</span>}
              <Tex className="block min-w-0 break-words">{c}</Tex>
            </button>
          );
        })}
      </div>
      <Details label="Raccourcis" className="hidden text-center lg:block">Touches {vf ? "V / F" : mode === "relier" ? "1 à 9" : "1 à 4"} pour répondre</Details>
      {err && <p className="text-sm text-ko" role="alert">{err}</p>}
    </div>
  );
}
