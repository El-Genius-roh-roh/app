"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { url } from "@/lib/url";
import { DEFI } from "@/config/constants";
import type { MemoryState } from "@/lib/quiz/service";
import Tex from "./Tex";
import Icon from "./Icon";

type Etat = { attemptId: string; elapsedMs: number; total: number; memory: MemoryState };

const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const LIBELLE = { q: "Question", r: "Réponse" } as const;

function Type({ face }: { face: "q" | "r" }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold tracking-wide uppercase ${face === "q" ? "text-accent-fort" : "text-energie"}`}>
      <span aria-hidden className={`h-2 w-2 ${face === "q" ? "rounded-[2px] bg-accent" : "rounded-full bg-energie"}`} />
      {LIBELLE[face]}
    </span>
  );
}

/**
 * Memory du jeu du jour (D46) : chaque paire retournée est vérifiée par le serveur (qui seul sait quelles cartes vont
 * ensemble). Classement au temps : le chrono démarre au lancement du jeu.
 */
export default function MemoryDefi({ initial }: { initial: Etat }) {
  const router = useRouter();
  const [mem, setMem] = useState(initial.memory);
  const [ouvertes, setOuvertes] = useState<number[]>([]);
  const [rate, setRate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(initial.elapsedMs);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t0 = performance.now();
    const i = setInterval(() => setNow(initial.elapsedMs + performance.now() - t0), 250);
    return () => clearInterval(i);
  }, [initial.elapsedMs]);
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current); }, []);

  const trouvees = new Set(mem.trouvees);
  const refermer = () => { if (minuteur.current) clearTimeout(minuteur.current); minuteur.current = null; setOuvertes([]); setRate(false); };

  async function retourner(i: number) {
    if (busy || trouvees.has(i)) return;
    let ouv = ouvertes;
    if (ouv.length === 2) { refermer(); ouv = []; }
    if (ouv.includes(i)) return;
    const suivantes = [...ouv, i];
    setOuvertes(suivantes);
    if (suivantes.length < 2) return;
    setBusy(true); setErr(null);
    const r = await fetch(url(`/api/quiz/${initial.attemptId}/answer`), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cartes: suivantes }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (j.done) { router.refresh(); return; }
    if (!r.ok) { setErr(j.error ?? "Erreur"); setOuvertes([]); return; }
    if (j.etat?.memory) setMem(j.etat.memory);
    if (j.paire) setOuvertes([]);
    else { setRate(true); minuteur.current = setTimeout(refermer, DEFI.MEMORY_DELAI_ERREUR_MS); }
  }

  const lues = ouvertes.map((k) => mem.cartes[k]);
  const nbTrouvees = mem.trouvees.length / 2;
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="chip"><Icon name="check" size={14} className="text-ok" /><span className="num">{nbTrouvees}/{initial.total}</span> paires</span>
          <span className="chip"><span className="num">{mem.rates}</span> raté{mem.rates > 1 ? "s" : ""}</span>
          <span className="num ml-auto inline-flex items-center gap-1.5 rounded-full border-2 border-ligne bg-surface px-3 py-1 text-lg font-semibold" aria-label={`Temps écoulé ${fmt(now)}`}>
            <Icon name="clock" size={16} className="text-accent" />{fmt(now)}
          </span>
        </div>
        <ul className="grid grid-cols-4 gap-2 sm:gap-3" aria-label="Plateau du Memory">
          {mem.cartes.map((c, i) => {
            const ok = trouvees.has(i);
            const up = ok || ouvertes.includes(i);
            const ko = rate && ouvertes.includes(i);
            return (
              <li key={i} className="mem-carte h-28 sm:h-36" data-up={up}>
                <button type="button" onClick={() => retourner(i)} disabled={ok}
                  aria-label={up ? `Carte ${i + 1}, ${LIBELLE[c.face]} : ${c.texte}${ok ? " (paire trouvée)" : ""}` : `Carte ${i + 1}, face cachée`}
                  className={`mem-in block rounded-[14px] text-left ${ko ? "mem-non" : ""} ${up ? "" : "active:translate-y-[3px]"}`}>
                  <span aria-hidden className="mem-face flex items-center justify-center border-accent-ombre bg-accent shadow-[inset_0_-4px_0_var(--color-accent-ombre)]">
                    <span className="grid grid-cols-2 gap-1.5 opacity-90">
                      <span className="h-3 w-3 rounded-[3px] bg-sur-accent/80" /><span className="h-3 w-3 rounded-full bg-or-vif" />
                      <span className="h-3 w-3 rounded-full bg-sur-accent/40" /><span className="h-3 w-3 rounded-[3px] bg-sur-accent/80" />
                    </span>
                  </span>
                  {up && (
                    <span aria-hidden className={`mem-face mem-avant flex flex-col gap-1 p-1.5 sm:p-2.5 ${
                      ok ? "border-ok bg-ok-doux" : ko ? "border-ko bg-ko-doux" : c.face === "q" ? "border-accent bg-surface" : "border-energie bg-surface"}`}>
                      <span className="flex items-center justify-between"><Type face={c.face} />{ok && <Icon name="check" size={14} className="text-ok" />}</span>
                      <span className={`line-clamp-4 text-[11.5px] leading-snug sm:text-[13px] ${c.face === "r" ? "font-semibold" : ""}`}><Tex>{c.texte}</Tex></span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {/* les cartes ouvertes en grand : sur téléphone, les cartes du plateau sont petites */}
      <aside className="space-y-3 lg:sticky lg:top-20">
        <div className={`card min-h-28 space-y-3 ${rate ? "border-ko" : ""}`}>
          {lues.length === 0
            ? <p className="muted text-sm">Retourne deux cartes : une question et sa réponse.</p>
            : lues.map((c, k) => (
              <div key={k} className="space-y-0.5">
                <Type face={c.face} />
                <p className={c.face === "r" ? "font-semibold" : "font-medium"}><Tex>{c.texte}</Tex></p>
              </div>
            ))}
          {rate && <p className="flex items-center gap-1.5 text-sm font-semibold text-ko"><Icon name="x" size={15} />Pas la bonne paire</p>}
        </div>
        {err && <p className="text-sm text-ko" role="alert">{err}</p>}
      </aside>
    </div>
  );
}
