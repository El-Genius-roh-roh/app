"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SeasonHistory } from "@/lib/ranking";

// Palette catégorielle validée (8 teintes, ordre fixe, distinguables par les daltoniens entre voisines).
// La couleur suit le joueur (ordre alphabétique), jamais son rang.
const SERIES = ["#257de0", "#f47230", "#00b894", "#f2a600", "#ee7fac", "#008a17", "#6a4ce2", "#ec4647"];
const GRID = "#ece9f5";
const AXIS_TEXT = "#64748b";
const H = 240, M = { t: 12, r: 16, b: 26, l: 34 };

type Mode = "cumul" | "note";

function niceMax(v: number) {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= v) ?? 10 * p);
}

export default function ScoreChart({ data, meId, maxQuestions }: { data: SeasonHistory; meId: string; maxQuestions: number }) {
  const [mode, setMode] = useState<Mode>("cumul");
  const [hover, setHover] = useState<number | null>(null);
  const [w, setW] = useState(600);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // au-delà de 8 joueurs, on garde les 8 meilleurs (une 9e couleur ne serait plus distinguable)
  const { series, caches } = useMemo(() => {
    const total = (p: SeasonHistory["joueurs"][number]) => p.points.reduce<number>((a, b) => a + (b ?? 0), 0);
    const all = data.joueurs.map((p, i) => ({ ...p, i }));
    const kept = all.length > SERIES.length ? [...all].sort((a, b) => total(b) - total(a)).slice(0, SERIES.length).sort((a, b) => a.i - b.i) : all;
    return {
      series: kept.map((p, k) => {
        let acc = 0;
        const cumul = p.points.map((v) => (acc += v ?? 0));
        return { ...p, color: SERIES[k], values: mode === "cumul" ? cumul : p.scores };
      }),
      caches: all.length - kept.length,
    };
  }, [data, mode]);

  const n = data.jours.length;
  if (n < 2 || data.joueurs.length === 0) {
    return <p className="muted">Le graphique apparaîtra après deux jours de jeu.</p>;
  }

  const yMax = mode === "note" ? maxQuestions : niceMax(Math.max(...series.flatMap((s) => s.values.map((v) => v ?? 0))));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => Math.round(k * yMax * 10) / 10);
  const iw = w - M.l - M.r, ih = H - M.t - M.b;
  const y = (v: number) => M.t + ih - (v / yMax) * ih;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 44))));
  const direct = series.length <= 4 && w >= 420;
  const right = direct ? 70 : 0;
  const xr = (i: number) => M.l + (i * (iw - right)) / (n - 1);

  const path = (vals: (number | null)[]) => {
    let d = "", pen = false;
    vals.forEach((v, i) => {
      if (v === null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${xr(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    setHover(Math.max(0, Math.min(n - 1, Math.round((px / r.width) * (n - 1)))));
  };

  const tipRows = hover === null ? [] : series
    .map((s) => ({ s, v: s.values[hover] }))
    .sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
  const tipLeft = hover === null ? 0 : Math.min(Math.max(xr(hover) - 80, 0), w - 170);

  return (
    <div className="space-y-3">
      <div className="flex rounded-2xl bg-violet-50 p-1" role="tablist">
        {([["cumul", "Points cumulés"], ["note", `Note du jour /${maxQuestions}`]] as const).map(([m, label]) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`flex-1 rounded-xl px-3 py-1.5 text-sm transition ${mode === m ? "bg-white text-violet-700 shadow" : "text-slate-500"}`}>
            {label}
          </button>
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {series.map((s) => (
          <li key={s.userId} className="flex items-center gap-1.5">
            <svg width="16" height="8" aria-hidden><line x1="1" y1="4" x2="15" y2="4" stroke={s.color} strokeWidth="3" strokeLinecap="round" /></svg>
            <span className={s.userId === meId ? "font-extrabold" : "font-semibold text-slate-700"}>{s.pseudo}{s.userId === meId ? " (moi)" : ""}</span>
          </li>
        ))}
      </ul>

      <div ref={box} className="relative" onPointerLeave={() => setHover(null)}>
        <svg width={w} height={H} role="img" aria-label={`Évolution des ${mode === "cumul" ? "points cumulés" : "notes du jour"} par joueur`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
              <text x={M.l - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={AXIS_TEXT}>{t}</text>
            </g>
          ))}
          {data.jours.map((j, i) => (i % labelEvery === 0 || i === n - 1) && (
            <text key={j.date} x={xr(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>J{j.jour}</text>
          ))}
          {hover !== null && <line x1={xr(hover)} x2={xr(hover)} y1={M.t} y2={M.t + ih} stroke="#c4b5fd" strokeWidth="1" />}
          {series.map((s) => (
            <g key={s.userId}>
              <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.userId === meId ? 3 : 2} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => v !== null && (n <= 31 || i === hover) && (
                <circle key={i} cx={xr(i)} cy={y(v)} r={i === hover ? 5 : 3.5} fill={s.color} stroke="#fff" strokeWidth="2" />
              ))}
            </g>
          ))}
          {direct && series.map((s) => {
            const last = s.values.reduce<number>((a, v, i) => (v !== null ? i : a), -1);
            if (last < 0) return null;
            return (
              <text key={s.userId} x={xr(last) + 8} y={y(s.values[last]!)} dy="0.32em" fontSize="12" fontWeight="700" fill="#334155">
                {s.pseudo.length > 9 ? s.pseudo.slice(0, 8) + "…" : s.pseudo}
              </text>
            );
          })}
          <rect x={M.l} y={M.t} width={iw - right} height={ih} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} style={{ touchAction: "pan-y" }} />
        </svg>

        {hover !== null && (
          <div className="pointer-events-none absolute top-0 w-[170px] rounded-2xl bg-white/95 p-2.5 text-xs shadow-lg ring-1 ring-violet-100" style={{ left: tipLeft }}>
            <p className="mb-1 font-extrabold text-slate-800">Jour {data.jours[hover].jour} · {data.jours[hover].date.slice(8)}/{data.jours[hover].date.slice(5, 7)}</p>
            {tipRows.map(({ s, v }) => (
              <p key={s.userId} className="flex items-center gap-1.5 text-slate-700">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 truncate">{s.pseudo}</span>
                <span className="font-bold tabular-nums">{v === null ? "absent" : mode === "cumul" ? `${v} pts` : `${v}/${maxQuestions}`}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      {caches > 0 && <p className="muted">{caches} autre{caches > 1 ? "s" : ""} joueur{caches > 1 ? "s" : ""} non affiché{caches > 1 ? "s" : ""} (8 meilleurs seulement).</p>}

      <details className="text-sm">
        <summary className="text-violet-600">Voir le tableau</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead><tr className="text-slate-500"><th className="py-1 pr-2">Joueur</th>{data.jours.map((j) => <th key={j.date} className="px-1">J{j.jour}</th>)}</tr></thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.userId} className="border-t border-violet-50">
                  <td className="py-1 pr-2 font-semibold">{s.pseudo}</td>
                  {s.values.map((v, i) => <td key={i} className="px-1">{v ?? "–"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
