"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SeasonHistory } from "@/lib/ranking";

// Palette catégorielle validée (8 teintes, ordre fixe, distinguables par les daltoniens entre voisines).
// La couleur suit le joueur (ordre alphabétique), jamais son rang.
// Teintes moyennes lisibles sur fond clair comme sombre (≥ 3:1 en trait) ; ni violet, ni le vert/rouge réservés à juste/faux.
const SERIES = ["#3d7efc", "#aa7e05", "#1f9e93", "#dd5403", "#d6407a", "#7f8791", "#6f8f1c", "#b0703a"];
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
  if (n < 1 || data.joueurs.length === 0) {
    return <p className="muted">Le graphique apparaîtra dès le premier quiz.</p>;
  }

  const yMax = mode === "note" ? maxQuestions : niceMax(Math.max(...series.flatMap((s) => s.values.map((v) => v ?? 0))));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => Math.round(k * yMax * 10) / 10);
  const iw = w - M.l - M.r, ih = H - M.t - M.b;
  const y = (v: number) => M.t + ih - (v / yMax) * ih;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 44))));
  const direct = series.length <= 4 && w >= 420;
  const right = direct ? 70 : 0;
  // un seul jour : le point est au milieu ; sinon les jours sont répartis sur la largeur
  const xr = (i: number) => (n === 1 ? M.l + (iw - right) / 2 : M.l + (i * (iw - right)) / (n - 1));

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
    setHover(n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((px / r.width) * (n - 1)))));
  };

  const tipRows = hover === null ? [] : series
    .map((s) => ({ s, v: s.values[hover] }))
    .sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
  const tipLeft = hover === null ? 0 : Math.min(Math.max(xr(hover) - 80, 0), w - 170);

  return (
    <div className="space-y-3">
      <div className="flex rounded-[14px] bg-surface-2 p-1" role="tablist">
        {([["cumul", "Gemmes de la saison"], ["note", `Note du jour /${maxQuestions}`]] as const).map(([m, label]) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`min-h-10 flex-1 rounded-[10px] px-3 text-sm font-bold transition-colors ${mode === m ? "bg-surface text-accent-fort shadow-[0_2px_0_var(--color-ligne)]" : "text-texte-3 hover:text-texte-2"}`}>
            {label}
          </button>
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {series.map((s) => (
          <li key={s.userId} className="flex items-center gap-1.5">
            <svg width="16" height="8" aria-hidden><line x1="1" y1="4" x2="15" y2="4" stroke={s.color} strokeWidth="3" strokeLinecap="round" /></svg>
            <span className={s.userId === meId ? "font-semibold text-texte" : "text-texte-2"}>{s.pseudo}{s.userId === meId ? " (moi)" : ""}</span>
          </li>
        ))}
      </ul>

      <div ref={box} className="relative" onPointerLeave={() => setHover(null)}>
        <svg width={w} height={H} role="img" aria-label={`Évolution des ${mode === "cumul" ? "gemmes de la saison" : "notes du jour"} par joueur`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} className="stroke-ligne" strokeWidth="1" />
              <text x={M.l - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" className="fill-texte-3">{t}</text>
            </g>
          ))}
          {data.jours.map((j, i) => (i % labelEvery === 0 || i === n - 1) && (
            <text key={j.date} x={xr(i)} y={H - 8} textAnchor="middle" fontSize="11" className="fill-texte-3">J{j.jour}</text>
          ))}
          {hover !== null && <line x1={xr(hover)} x2={xr(hover)} y1={M.t} y2={M.t + ih} className="stroke-texte-3" strokeWidth="1" strokeDasharray="3 3" />}
          {series.map((s) => (
            <g key={s.userId}>
              <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.userId === meId ? 3 : 2} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => v !== null && (n <= 31 || i === hover) && (
                <circle key={i} cx={xr(i)} cy={y(v)} r={i === hover ? 5 : 3.5} fill={s.color} className="stroke-surface" strokeWidth="2" />
              ))}
            </g>
          ))}
          {direct && series.map((s) => {
            const last = s.values.reduce<number>((a, v, i) => (v !== null ? i : a), -1);
            if (last < 0) return null;
            return (
              <text key={s.userId} x={xr(last) + 8} y={y(s.values[last]!)} dy="0.32em" fontSize="12" fontWeight="600" className="fill-texte-2">
                {s.pseudo.length > 9 ? s.pseudo.slice(0, 8) + "…" : s.pseudo}
              </text>
            );
          })}
          <rect x={M.l} y={M.t} width={iw - right} height={ih} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} style={{ touchAction: "pan-y" }} />
        </svg>

        {hover !== null && (
          <div className="pointer-events-none absolute top-0 w-[170px] rounded-xl border border-ligne bg-surface-2 p-2.5 text-xs shadow-lg shadow-black/40" style={{ left: tipLeft }}>
            <p className="mb-1 font-semibold text-texte">Jour {data.jours[hover].jour} · {data.jours[hover].date.slice(8)}/{data.jours[hover].date.slice(5, 7)}</p>
            {tipRows.map(({ s, v }) => (
              <p key={s.userId} className="flex items-center gap-1.5 text-texte-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 truncate">{s.pseudo}</span>
                <span className="num font-bold">{v === null ? "absent" : mode === "cumul" ? `${v} tr.` : `${v}/${maxQuestions}`}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      {caches > 0 && <p className="muted">{caches} autre{caches > 1 ? "s" : ""} joueur{caches > 1 ? "s" : ""} non affiché{caches > 1 ? "s" : ""} (8 meilleurs seulement).</p>}

      <details className="text-sm">
        <summary className="lien inline-flex min-h-11 items-center no-underline">Voir le tableau</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left font-num text-xs tabular-nums">
            <thead><tr className="text-texte-3"><th className="py-1 pr-2">Joueur</th>{data.jours.map((j) => <th key={j.date} className="px-1">J{j.jour}</th>)}</tr></thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.userId} className="border-t border-ligne">
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
