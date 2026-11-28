"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { url } from "@/lib/url";
import Tex from "@/components/Tex";
import Icon from "@/components/Icon";
import CopyButton from "@/components/CopyButton";
import Details from "@/components/Details";

type J = { id: string; name: string; bot: boolean; left: boolean; pos: number; bonnes: number; tentees: number; host: boolean };
type Vue = {
  v: number; now: number; code: string; phase: "lobby" | "lancer" | "question" | "resultat" | "final"; host: string; me: string; tour: string | null;
  deadline: number; phaseStart: number; arrivee: number; themes: { id: string; nom: string }[]; cases: string[];
  de: number | null; cible: number | null; gagnant: string | null; journal: string[]; joueurs: J[]; classement?: string[];
  question: { theme: string; kind: "qcm" | "vf"; enonce: string; choices: string[]; key?: number; explication?: string } | null;
  reponse: { choice: number | null; ok: boolean } | null;
};

// Couleurs des thèmes : texte blanc ≥ 4,5:1, jamais vert ni rouge (réservés à juste/faux), jamais violet.
const THEMES = ["#2463df", "#b54303", "#0f6e78", "#8b6706", "#515962", "#9b2f6b"];
// Pions : nuances 700 de la palette (comme les avatars).
const PIONS = ["#0a4ac5", "#943501", "#036a34", "#a7001c", "#573f02", "#515962"];
const COLS = 5;

/** Dé 3D en CSS – cube avec 6 faces, animation de lancer. */
function De({ n, size = 56 }: { n: number | null; size?: number }) {
  const DOTS: Record<number, number[]> = {
    1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9],
  };
  const half = size / 2;
  // rotation finale selon la face à montrer
  const FINAL: Record<number, string> = {
    1: "rotateX(-8deg) rotateY(10deg) rotateY(0deg)",
    2: "rotateX(-8deg) rotateY(10deg) rotateY(180deg)",
    3: "rotateX(-8deg) rotateY(10deg) rotateY(90deg)",
    4: "rotateX(-8deg) rotateY(10deg) rotateY(-90deg)",
    5: "rotateX(-8deg) rotateY(10deg) rotateX(-90deg)",
    6: "rotateX(-8deg) rotateY(10deg) rotateX(90deg)",
  };
  const [rolling, setRolling] = useState(false);
  const prevN = useRef<number | null>(null);
  useEffect(() => {
    if (n !== null && prevN.current !== n) { setRolling(true); const t = setTimeout(() => setRolling(false), 760); prevN.current = n; return () => clearTimeout(t); }
    prevN.current = n;
  }, [n]);
  const face = n ?? 1;
  return (
    <div className="shrink-0" role="img" aria-label={n ? `Dé : ${n}` : "Dé"}>
      <div className="de-3d" style={{ width: size, height: size, "--de-tz": `${half}px`, "--de-final": FINAL[face] } as React.CSSProperties}>
        <div className="de-3d-cube" data-show={rolling ? undefined : (n ?? "idle")} data-rolling={rolling || undefined}>
          {[1, 2, 3, 4, 5, 6].map((f) => (
            <div key={f} className="de-3d-face" data-f={f}>
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className={DOTS[f].includes(i + 1) ? "de-3d-dot" : ""} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="de-3d-shadow" aria-hidden />
    </div>
  );
}

export default function PlateauRoom({ code }: { code: string }) {
  const [v, setV] = useState<Vue | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vue3d, setVue3d] = useState(true);
  const [, setTick] = useState(0);
  const offset = useRef(0);
  const ver = useRef(-1);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(url(`/api/plateau?code=${code}&v=${ver.current}`), { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { if (r.status === 404 || r.status === 403) setGone(true); setErr(j.error ?? "Erreur"); return; }
      offset.current = j.now - Date.now();
      if (j.nochange) return;
      ver.current = j.v;
      setV(j);
      setErr(null);
    } catch { /* réseau : on réessaie au prochain tour */ }
  }, [code]);

  useEffect(() => {
    poll();
    const i = setInterval(poll, 700);
    const t = setInterval(() => setTick((x) => x + 1), 250);
    return () => { clearInterval(i); clearInterval(t); };
  }, [poll]);

  // sur téléphone, le plateau occupe l'écran : quand vient mon tour, on fait défiler jusqu'au dé et à la question
  const panneau = useRef<HTMLElement>(null);
  const monTour = v && v.tour === v.me && (v.phase === "lancer" || v.phase === "question") ? `${v.phase}-${v.phaseStart}` : "";
  useEffect(() => {
    if (monTour && window.innerWidth < 1024) panneau.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [monTour]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    const r = await fetch(url("/api/plateau"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, code, ...extra }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) setErr(j.error ?? "Erreur");
    ver.current = -1;
    poll();
    return r.ok;
  }

  if (gone) return (
    <Shell>
      <div className="card space-y-3">
        <p className="font-semibold text-ko" role="alert">{err ?? "Cette partie est terminée ou n'existe plus."}</p>
        <Link href="/arene" className="btn-white"><Icon name="arrowLeft" size={17} />Retour à l&apos;Arène</Link>
      </div>
    </Shell>
  );
  if (!v) return <Shell><p className="flex items-center gap-2 text-texte-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/25 border-t-accent" aria-hidden />Connexion à la partie…</p></Shell>;

  const now = Date.now() + offset.current;
  const reste = Math.max(0, Math.ceil((v.deadline - now) / 1000));
  const couleurTheme = (id: string) => THEMES[Math.max(0, v.themes.findIndex((t) => t.id === id)) % THEMES.length];
  const nomTheme = (id: string) => v.themes.find((t) => t.id === id)?.nom ?? "";
  const pion = (id: string) => PIONS[Math.max(0, v.joueurs.findIndex((j) => j.id === id)) % PIONS.length];
  const actif = v.joueurs.find((j) => j.id === v.tour);
  const aMoi = v.tour === v.me && (v.phase === "lancer" || v.phase === "question");

  /* ------------------------------------------------ salon */
  if (v.phase === "lobby") {
    const meHost = v.host === v.me;
    return (
      <Shell>
        <section className="hero entree text-center">
          <p className="eyebrow">Jeu de plateau · code</p>
          <p className="code mt-2 text-6xl font-semibold tracking-[0.25em]">{v.code}</p>
          <CopyButton text={v.code} label="Copier le code" className="absolute top-3 right-3 text-sur-accent/70 hover:!bg-sur-accent/15 hover:!text-sur-accent" />
          <p className="mt-3 text-sm opacity-90">À saisir dans « Rejoindre », sur la page Arène.</p>
        </section>
        <div className="card flex items-center gap-3 py-3">
          <De n={5} size={40} />
          <Details label="Règles du jeu">
            Chacun son tour, lance le dé. Pour avancer jusqu&apos;à la case visée, réponds juste à une question de <b className="text-texte-2">son thème</b>. Faux ou trop lent : tu restes sur place. Le premier à la case <span className="num">{v.arrivee}</span> gagne.
          </Details>
        </div>
        <section className="space-y-3" aria-labelledby="t-j">
          <h2 id="t-j" className="h2">Joueurs <span className="num text-texte-3">{v.joueurs.length}</span></h2>
          <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
            {v.joueurs.map((j) => (
              <li key={j.id} className="card pop flex items-center gap-2.5 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-titre font-extrabold text-white" style={{ background: pion(j.id) }} aria-hidden>
                  {j.bot ? <Icon name="bot" size={18} /> : j.name[0]?.toUpperCase()}
                </span>
                <span className="min-w-0"><span className="block truncate font-bold">{j.name}</span>{j.host && <span className="block text-xs font-semibold text-energie">Hôte</span>}</span>
              </li>
            ))}
          </ul>
        </section>
        {meHost ? (
          <div className="space-y-3">
            <button onClick={() => act("start")} disabled={busy} className="btn-primary min-h-14 text-lg"><Icon name="play" size={20} />Lancer la partie</button>
            <button onClick={() => act("bot")} disabled={busy} className="btn-white"><Icon name="bot" size={18} />Ajouter un bot</button>
          </div>
        ) : <p className="card flex items-center justify-center gap-2 text-texte-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" aria-hidden />En attente du lancement par l&apos;hôte…</p>}
        <button onClick={() => act("leave").then(() => (location.href = url("/arene")))} className="back mx-auto flex"><Icon name="arrowLeft" size={16} />Quitter la partie</button>
        {err && <p className="text-center text-sm font-semibold text-ko" role="alert">{err}</p>}
      </Shell>
    );
  }

  /* ------------------------------------------------ plateau : serpentin de 5 colonnes, départ en bas à gauche */
  const n = v.arrivee + 1;
  const lignes = Math.ceil(n / COLS);
  const grille: (number | null)[] = [];
  for (let d = 0; d < lignes; d++) {
    const r = lignes - 1 - d;
    for (let c = 0; c < COLS; c++) { const i = r * COLS + (r % 2 === 0 ? c : COLS - 1 - c); grille.push(i < n ? i : null); }
  }
  const plateau = (
    <section aria-label="Plateau" className="space-y-3">
      <div className="flex items-center justify-end">
        <button type="button" onClick={() => setVue3d((x) => !x)} aria-pressed={vue3d}
          className="chip cursor-pointer transition-colors hover:border-ligne-forte hover:text-texte">
          {vue3d ? "Vue 3D" : "Vue 2D"}
        </button>
      </div>
      <div className={vue3d ? "plateau-3d" : ""}>
      <ol className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {grille.map((i, k) => {
          if (i === null) return <li key={`v${k}`} aria-hidden />;
          const t = v.cases[i];
          const ici = v.joueurs.filter((j) => j.pos === i && !j.left);
          const vise = v.cible === i && (v.phase === "question" || v.phase === "resultat");
          const depart = i === 0, fin = i === v.arrivee;
          return (
            <li key={i} aria-label={`Case ${i}${depart ? ", départ" : `, ${nomTheme(t)}`}${fin ? ", arrivée" : ""}${ici.length ? ` : ${ici.map((j) => j.name).join(", ")}` : ""}`}
              className={`relative flex aspect-[6/5] flex-col sm:aspect-square justify-between overflow-hidden rounded-[12px] p-1 sm:p-1.5 transition-transform duration-300 ${depart ? "border-2 border-ligne-forte bg-surface-2 text-texte" : "text-white"} ${vise ? "case-vise outline-4 outline-offset-2 outline-or-vif" : ""}`}
              style={depart ? undefined : { background: couleurTheme(t), boxShadow: "inset 0 -3px 0 rgb(0 0 0 / 0.22)" }}>
              {fin && <span aria-hidden className="absolute inset-x-0 top-0 h-2 bg-[repeating-conic-gradient(#fff_0_25%,#181c21_0_50%)] bg-[length:8px_8px]" />}
              <span className={`num text-[11px] leading-none font-semibold sm:text-xs ${fin ? "mt-2" : ""}`}>{depart ? "Départ" : i}</span>
              {!depart && <span className="truncate text-[9.5px] leading-tight font-bold uppercase opacity-95 sm:text-[11px]">{fin ? "Arrivée" : nomTheme(t)}</span>}
              {ici.length > 0 && (
                <span className="absolute right-0.5 bottom-3.5 flex -space-x-1.5 sm:right-1 sm:bottom-5">
                  {ici.map((j) => (
                    <span key={j.id} title={j.name}
                      className={`pion-3d flex items-center justify-center rounded-full font-titre font-extrabold text-white ring-2 ring-white ${j.id === v.tour && v.phase !== "final" ? "h-6 w-6 text-[11px] sm:h-8 sm:w-8 sm:text-sm" : "h-5 w-5 text-[9px] sm:h-6 sm:w-6 sm:text-[11px]"}`}
                      style={{ background: pion(j.id) }}>{j.bot ? <Icon name="bot" size={12} /> : j.name[0]?.toUpperCase()}</span>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-texte-2" aria-label="Thèmes">
        {v.themes.map((t) => <li key={t.id} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[4px]" style={{ background: couleurTheme(t.id) }} />{t.nom}</li>)}
      </ul>
    </section>
  );

  const liste = v.classement ? v.classement.map((id) => v.joueurs.find((j) => j.id === id)!) : v.joueurs;
  const joueurs = (
    <ol className="liste" aria-label="Joueurs">
      {liste.map((j, i) => (
        <li key={j.id} className={`ligne ${j.id === v.tour && v.phase !== "final" ? "bg-accent-doux shadow-[inset_4px_0_0_var(--color-accent)]" : ""} ${j.left ? "opacity-50" : ""}`}>
          {v.classement && <span className={`rang ${i < 3 ? "text-or" : ""}`}>{i + 1}</span>}
          <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-surface" style={{ background: pion(j.id) }} aria-hidden />
          <span className="min-w-0 flex-1 truncate font-semibold">{j.name}{j.id === v.me && <span className="ml-1.5 text-xs font-bold text-accent-fort">moi</span>}{j.left && <span className="ml-1 text-xs text-texte-3">(parti)</span>}</span>
          <span className="num text-xs text-texte-3">{j.bonnes}/{j.tentees}</span>
          <span className="num w-12 text-right font-semibold">{j.pos}/{v.arrivee}</span>
        </li>
      ))}
    </ol>
  );

  /* ------------------------------------------------ fin */
  if (v.phase === "final") {
    const g = v.joueurs.find((j) => j.id === v.gagnant);
    return (
      <Shell large>
        <section className="hero pop text-center">
          <p className="eyebrow">Fin de la partie</p>
          <h1 className="mt-1 font-titre text-4xl font-extrabold">{g ? (g.id === v.me ? "Tu as gagné !" : `${g.name} gagne !`) : "Partie arrêtée"}</h1>
          {g && <p className="mt-2 text-[15px] opacity-90">Arrivée à la case {v.arrivee} avec <span className="num">{g.bonnes}</span> bonne{g.bonnes > 1 ? "s" : ""} réponse{g.bonnes > 1 ? "s" : ""} sur <span className="num">{g.tentees}</span>.</p>}
        </section>
        <div className="space-y-5 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-8 lg:space-y-0">
          {plateau}
          <div className="space-y-4">{joueurs}<Link href="/arene" className="btn-primary"><Icon name="play" size={18} />Rejouer</Link></div>
        </div>
      </Shell>
    );
  }

  /* ------------------------------------------------ tour en cours */
  const q = v.question;
  const res = v.phase === "resultat";
  return (
    <Shell large>
      <div className="space-y-5 lg:grid lg:grid-cols-[1fr_420px] lg:items-start lg:gap-8 lg:space-y-0">
        {plateau}
        <div className="space-y-4">
          <section ref={panneau} className={`card scroll-mt-20 scroll-mb-24 space-y-4 ${aMoi ? "border-accent" : ""}`}>
            <div className="flex items-center gap-3">
              <De key={`${v.tour}-${v.de}`} n={v.de} />
              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="eyebrow">{aMoi ? "À toi de jouer" : `Au tour de ${actif?.name ?? "…"}`}</p>
                <p className="font-bold">
                  {v.phase === "lancer" ? (aMoi ? "Lance le dé !" : `${actif?.name} lance le dé…`)
                    : v.cible !== null && <>{v.de} au dé → case {v.cible} <span className="ml-1 inline-flex rounded-full px-2 py-0.5 text-xs text-white" style={{ background: couleurTheme(v.cases[v.cible]) }}>{nomTheme(v.cases[v.cible])}</span></>}
                </p>
              </div>
              {!res && <span className={`num flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] font-semibold ${reste <= 5 ? "border-ko text-ko" : "border-accent text-texte"}`} aria-label={`${reste} secondes`}>{reste}</span>}
            </div>
            {v.phase === "lancer" && aMoi && (
              <button onClick={() => act("roll")} disabled={busy} className="btn-orange min-h-14 text-lg"><Icon name="play" size={18} />Lancer le dé</button>
            )}
            {q && (
              <div className="space-y-3">
                <p className="text-lg leading-snug font-bold whitespace-pre-line"><Tex>{q.enonce}</Tex></p>
                <div className={`grid gap-2 ${q.kind === "vf" ? "grid-cols-2" : ""}`}>
                  {q.choices.map((c, i) => {
                    const cle = res && q.key === i, choisi = res && v.reponse?.choice === i;
                    const jouable = aMoi && v.phase === "question";
                    return (
                      <button key={i} disabled={!jouable || busy} onClick={() => act("answer", { choice: i })}
                        className={`flex min-h-12 items-center gap-2 rounded-[14px] border-2 px-3.5 py-2.5 text-left font-semibold transition-[transform,box-shadow] ${
                          cle ? "border-ok bg-ok-doux text-ok" : choisi ? "border-ko bg-ko-doux text-ko"
                            : jouable ? "border-ligne bg-surface shadow-[0_3px_0_var(--color-ligne)] hover:border-accent active:translate-y-[3px] active:shadow-none"
                              : "border-ligne bg-surface text-texte-2"}`}>
                        {q.kind !== "vf" && <span className="num w-5 shrink-0 text-texte-3">{String.fromCharCode(65 + i)}</span>}
                        <Tex className="min-w-0 break-words">{c}</Tex>
                        {cle && <Icon name="check" size={18} className="ml-auto shrink-0" label="Bonne réponse" />}
                        {choisi && !cle && <Icon name="x" size={18} className="ml-auto shrink-0" label="Réponse donnée" />}
                      </button>
                    );
                  })}
                </div>
                {!aMoi && v.phase === "question" && <p className="text-sm text-texte-3">{actif?.name} réfléchit… Cherche la réponse dans ta tête !</p>}
                {res && v.reponse && (
                  <p className={`pop flex items-center gap-2 rounded-[14px] p-3 font-extrabold ${v.reponse.ok ? "bg-ok text-sur-ok" : "bg-ko text-sur-ko"}`} role="status">
                    <Icon name={v.reponse.ok ? "check" : v.reponse.choice === null ? "clock" : "x"} size={20} />
                    {v.reponse.ok ? `Juste ! ${actif?.name} avance case ${v.cible}.` : `${v.reponse.choice === null ? "Temps écoulé" : "Faux"} : ${actif?.name} reste sur place.`}
                  </p>
                )}
                {res && q.explication && <p className="flex items-start gap-2 text-sm text-texte-2"><Icon name="lightbulb" size={16} className="mt-0.5 shrink-0 text-or" /><span><Tex>{q.explication}</Tex></span></p>}
              </div>
            )}
          </section>
          {joueurs}
          {v.journal.length > 0 && (
            <section aria-labelledby="t-journal" className="space-y-1.5">
              <h2 id="t-journal" className="eyebrow">Derniers coups</h2>
              <ul className="space-y-1 text-sm text-texte-2">{v.journal.slice(0, 4).map((l, i) => <li key={i} className={i === 0 ? "text-texte" : ""}>{l}</li>)}</ul>
            </section>
          )}
          <button onClick={() => act("leave").then(() => (location.href = url("/arene")))} className="back"><Icon name="arrowLeft" size={16} />Quitter la partie</button>
          {err && <p className="text-sm font-semibold text-ko" role="alert">{err}</p>}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children, large }: { children: React.ReactNode; large?: boolean }) {
  return <main className={`mx-auto space-y-5 px-4 pt-5 pb-16 lg:space-y-6 lg:pt-10 ${large ? "max-w-xl lg:max-w-6xl lg:px-8" : "max-w-xl lg:max-w-3xl"}`}>{children}</main>;
}
