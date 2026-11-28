"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { url } from "@/lib/url";
import Tex from "@/components/Tex";
import Icon from "@/components/Icon";
import CopyButton from "@/components/CopyButton";

type P = {
  id: string; name: string; bot: boolean; left: boolean; host: boolean; score: number; streak: number; rank: number; pos: number;
  answered: boolean; round?: { ok: boolean; pts: number; bonus: number; missed: boolean; choice: number | null; move: number; turbo: boolean };
};
type View = {
  v: number; now: number; code: string; phase: "lobby" | "question" | "reveal" | "final"; mode: string; modeTitre: string; arrivee: number; host: string; me: string;
  idx: number; nrounds: number; deadline: number; phaseStart: number; revealMs: number; players: P[]; classee: boolean;
  round?: { kind: "qcm" | "vf"; enonce: string; choices: string[]; limitMs: number; key?: number; explication?: string };
  my?: { answered: boolean; choice: number | null };
  final?: { changes: Record<string, number>; recap: { enonce: string; bonne: string; explication: string; ok: boolean; pts: number }[] };
};

// Réponses : une couleur ET une forme par case (jamais la couleur seule). Nuances 600-700 de scripts/palette.mjs,
// texte blanc ≥ 4,5:1. Le vert est exclu : il signifie « juste » à la correction.
const CASES = [
  { fond: "#c71f2d", ombre: "#830215", forme: "M12 3 22 20H2z" },                                  // rouge, triangle
  { fond: "#2463df", ombre: "#0037a0", forme: "M12 2 22 12 12 22 2 12z" },                          // bleu, losange
  { fond: "#8b6706", ombre: "#573f02", forme: "M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18z" },             // or, rond
  { fond: "#0f6e78", ombre: "#0a4a51", forme: "M4 4h16v16H4z" },                                    // sarcelle, carré
];
const JOUEURS = ["#0a4ac5", "#943501", "#036a34", "#a7001c", "#573f02", "#515962"];
/** Couleur stable d'un joueur (la liste est triée par classement, l'ordre change d'une manche à l'autre). */
const couleur = (id: string) => JOUEURS[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % JOUEURS.length];

/** Petite voiture vue de profil, tournée vers l'arrivée. */
function Voiture({ fond, size = 40 }: { fond: string; size?: number }) {
  return (
    <svg width={size} height={size / 2} viewBox="0 0 40 20" aria-hidden className="shrink-0">
      <path d="M9 8 13.5 2.5h12L31 8z" fill={fond} />
      <rect x="1.5" y="7.5" width="37" height="8.5" rx="3.5" fill={fond} />
      <path d="M15 7.5 17.2 4h3.8v3.5zM23 4h2.4l3 3.5H23z" fill="#fff" opacity=".8" />
      <rect x="35" y="9.5" width="3" height="2" rx="1" fill="#f1b620" />
      <circle cx="10.5" cy="16" r="3.3" fill="#181c21" /><circle cx="10.5" cy="16" r="1.3" fill="#b9c2cd" />
      <circle cx="29.5" cy="16" r="3.3" fill="#181c21" /><circle cx="29.5" cy="16" r="1.3" fill="#b9c2cd" />
    </svg>
  );
}

/** Mode Course : une ligne par joueur ; la voiture avance sur une bonne réponse, recule sur une erreur. */
function Piste({ players, me, arrivee, reveal }: { players: P[]; me: string; arrivee: number; reveal: boolean }) {
  const lignes = [...players].sort((a, b) => a.id.localeCompare(b.id)); // ordre fixe : les voitures ne changent pas de ligne
  return (
    <section className="card space-y-2 p-3 lg:p-4" aria-label="Piste de la course">
      {lignes.map((p) => {
        const m = reveal ? p.round : undefined;
        return (
          <div key={p.id} className={`flex items-center gap-2 ${p.left ? "opacity-40" : ""}`}>
            <span className={`w-16 shrink-0 truncate text-xs font-bold sm:w-24 sm:text-sm ${p.id === me ? "text-accent-fort" : ""}`}>{p.name}</span>
            <div className="relative h-9 flex-1 rounded-[10px] bg-surface-2"
              role="img" aria-label={`${p.name} : case ${p.pos} sur ${arrivee}${m ? (m.move > 0 ? `, avance de ${m.move}` : m.move < 0 ? `, recule de ${-m.move}` : ", reste sur place") : ""}`}>
              <div aria-hidden className="absolute inset-y-1 right-3 left-1 flex">
                {Array.from({ length: arrivee }, (_, i) => <span key={i} className="flex-1 border-r border-dashed border-ligne-forte/70 last:border-r-0" />)}
              </div>
              <span aria-hidden className="absolute inset-y-0 right-0 w-2.5 rounded-r-[10px] bg-[repeating-conic-gradient(var(--color-texte)_0_25%,var(--color-surface)_0_50%)] bg-[length:6px_6px]" />
              <span className="absolute top-1/2 transition-[left] duration-700 ease-out" style={{ left: `calc(${p.pos / arrivee} * (100% - 44px))`, translate: "0 -50%" }}>
                <Voiture fond={couleur(p.id)} />
                {m && !p.left && (
                  <span className={`pop absolute -top-3 left-6 rounded-full px-1.5 text-[11px] leading-4 font-extrabold whitespace-nowrap ${m.move > 0 ? "bg-ok text-sur-ok" : m.move < 0 ? "bg-ko text-sur-ko" : "bg-ligne-forte text-texte"}`}>
                    {m.move > 0 ? `+${m.move}` : m.move < 0 ? `−${-m.move}` : "="}{m.turbo && " turbo"}
                  </span>
                )}
              </span>
            </div>
            <span className="num w-10 shrink-0 text-right text-xs text-texte-3">{p.pos}/{arrivee}</span>
          </div>
        );
      })}
    </section>
  );
}

const Forme = ({ d, size = 22 }: { d: string; size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path d={d} fill="currentColor" /></svg>;

export default function ArenaRoom({ code }: { code: string }) {
  const [v, setV] = useState<View | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const offset = useRef(0);
  const ver = useRef(-1);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(url(`/api/arene?code=${code}&v=${ver.current}`), { cache: "no-store" });
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
    const t = setInterval(() => setTick((x) => x + 1), 100);
    return () => { clearInterval(i); clearInterval(t); };
  }, [poll]);

  // nouvelle manche → on efface la sélection locale
  const roundKey = v ? `${v.phase === "question" ? "q" : "r"}${v.idx}` : "";
  const lastRound = useRef("");
  useEffect(() => {
    if (roundKey.startsWith("q") && lastRound.current !== roundKey) setPicked(null);
    lastRound.current = roundKey;
  }, [roundKey]);

  // raccourcis clavier 1-4 (et V/F)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!v || v.phase !== "question" || v.my?.answered) return;
      const n = Number(e.key);
      if (n >= 1 && n <= (v.round?.choices.length ?? 0)) send(n - 1);
      if (v.round?.kind === "vf" && (e.key === "v" || e.key === "f")) send(e.key === "v" ? 0 : 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  async function act(action: string, extra: Record<string, unknown> = {}) {
    const r = await fetch(url("/api/arene"), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, code, ...extra }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error ?? "Erreur");
    ver.current = -1;
    poll();
    return r.ok;
  }

  function send(choice: number) {
    if (!v || picked !== null || v.my?.answered) return;
    setPicked(choice);
    act("answer", { round: v.idx, choice }).then((ok) => { if (!ok) setPicked(null); });
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
  const meHost = v.host === v.me;
  const me = v.players.find((p) => p.id === v.me);

  /* ------------------------------------------------ salon d'attente */
  if (v.phase === "lobby") {
    const humans = v.players.filter((p) => !p.bot).length;
    return (
      <Shell>
        <section className="hero entree text-center">
          <p className="eyebrow">Code de la partie</p>
          <p className="code mt-2 text-6xl font-semibold tracking-[0.25em]">{v.code}</p>
          <CopyButton text={v.code} label="Copier le code" className="absolute top-3 right-3 text-sur-accent/70 hover:!bg-sur-accent/15 hover:!text-sur-accent" />
          <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span>{v.modeTitre} · <span className="num">{v.nrounds}</span> manches</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 font-semibold text-texte">
              <Icon name={v.classee ? "trophy" : "target"} size={14} className={v.classee ? "text-or" : "text-texte-2"} />{v.classee ? "Classée" : "Entraînement"}
            </span>
          </p>
        </section>
        {v.mode === "course" && (
          <p className="card flex items-start gap-2.5 text-sm text-texte-2">
            <Voiture fond="#2463df" size={34} />
            <span>Bonne réponse : ta voiture avance de 2 cases, 3 si tu es le plus rapide. Erreur : elle recule d&apos;une case. Pas de réponse : elle reste sur place. Le premier à <span className="num">{v.arrivee}</span> cases gagne.</span>
          </p>
        )}
        <section className="space-y-3" aria-labelledby="t-joueurs">
          <h2 id="t-joueurs" className="h2">Joueurs <span className="num text-texte-3">{v.players.length}</span></h2>
          <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {v.players.map((p, i) => (
              <li key={p.id} className="card pop flex items-center gap-2.5 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-titre font-extrabold text-white" style={{ background: JOUEURS[i % JOUEURS.length] }} aria-hidden>
                  {p.bot ? <Icon name="bot" size={18} /> : p.name[0]?.toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{p.name}</span>
                  {p.host && <span className="block text-xs font-semibold text-energie">Hôte</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
        {meHost ? (
          <div className="space-y-3">
            <button onClick={() => act("start")} className="btn-primary min-h-14 text-lg">
              <Icon name="play" size={20} />Lancer la partie
            </button>
            <button onClick={() => act("bot")} className="btn-white"><Icon name="bot" size={18} />Ajouter un bot</button>
            {humans < 2 && <p className="text-center text-sm text-texte-3">Partage le code à tes amis pour une partie classée. Avec des bots, c&apos;est de l&apos;entraînement.</p>}
          </div>
        ) : <p className="card flex items-center justify-center gap-2 text-texte-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" aria-hidden />En attente du lancement par l&apos;hôte…</p>}
        <button onClick={() => act("leave").then(() => (location.href = url("/arene")))} className="back mx-auto flex"><Icon name="arrowLeft" size={16} />Quitter la partie</button>
        {err && <p className="text-center text-sm font-semibold text-ko" role="alert">{err}</p>}
      </Shell>
    );
  }

  /* ------------------------------------------------ podium final */
  if (v.phase === "final") {
    const top = v.players.slice(0, 3);
    const order = [1, 0, 2].filter((i) => top[i]);
    const delta = v.final?.changes[v.me];
    const MARCHES = [{ h: "h-32", c: "bg-or-vif text-sur-or" }, { h: "h-24", c: "bg-ligne-forte text-texte" }, { h: "h-16", c: "bg-[#b0703a] text-white" }];
    return (
      <Shell>
        <header className="entree text-center">
          <p className="eyebrow">Fin de la partie</p>
          <h1 className="title mt-1">{me && me.rank === 1 ? "Victoire !" : me ? `${me.rank}e place` : "Podium"}</h1>
        </header>
        <div className="podium-3d">
          {order.map((i) => (
            <div key={top[i].id} className="podium-3d-step pop">
              <span className="w-full truncate text-center text-sm font-bold">{top[i].name}</span>
              <span className="num text-sm text-texte-2">{v.mode === "course" ? `case ${top[i].pos}/${v.arrivee}` : `${top[i].score} pts`}</span>
              <div className={`podium-3d-block ${MARCHES[i].h}`}>
                <div className={`podium-3d-cap ${MARCHES[i].c}`} aria-hidden />
                <div className={`podium-3d-face font-titre ${MARCHES[i].c}`}>{i + 1}</div>
              </div>
            </div>
          ))}
        </div>
        {delta !== undefined ? (
          <p className="card text-center">Ta cote Arène : <b className={`num ${delta >= 0 ? "text-ok" : "text-ko"}`}>{delta >= 0 ? "+" : "−"}{Math.abs(delta)} pts</b></p>
        ) : !v.classee && (
          <p className="card flex items-start gap-2 text-sm text-texte-2"><Icon name="target" size={17} className="mt-0.5 shrink-0" />Partie d&apos;entraînement : elle ne compte pas au classement (il faut au moins 2 joueurs humains).</p>
        )}
        {v.mode === "course" && <Piste players={v.players} me={v.me} arrivee={v.arrivee} reveal={false} />}
        <Ranking players={v.players} me={v.me} changes={v.final?.changes} course={v.mode === "course"} arrivee={v.arrivee} />
        {v.final && v.final.recap.some((r) => !r.ok) && (
          <section className="space-y-3" aria-labelledby="t-revoir">
            <h2 id="t-revoir" className="h2 flex items-center gap-2"><Icon name="book" className="text-texte-3" />À revoir</h2>
            <ul className="space-y-2.5">
              {v.final.recap.filter((r) => !r.ok).map((r, i) => (
                <li key={i} className="card space-y-2">
                  <p className="font-medium whitespace-pre-line"><Tex>{r.enonce}</Tex></p>
                  <p className="flex items-start gap-2 font-semibold text-ok"><Icon name="check" size={16} className="mt-0.5 shrink-0" /><Tex>{r.bonne}</Tex></p>
                  {r.explication && <p className="text-sm text-texte-2"><Tex>{r.explication}</Tex></p>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <Link href="/arene" className="btn-primary"><Icon name="swords" size={18} />Rejouer</Link>
      </Shell>
    );
  }

  /* ------------------------------------------------ question / correction */
  const r = v.round!;
  const question = v.phase === "question";
  const left = question ? Math.max(0, v.deadline - now) : Math.max(0, v.phaseStart + v.revealMs - now);
  const total = question ? r.limitMs : v.revealMs;
  const mine = me?.round;
  const chosen = question ? (v.my?.answered ? v.my.choice ?? picked : picked) : (mine?.choice ?? null);
  const nAnswered = v.players.filter((p) => p.answered && !p.left).length;
  const nActive = v.players.filter((p) => !p.left).length;
  const urgent = question && left < 5000;
  const course = v.mode === "course";

  return (
    <Shell>
      <div className="flex items-center justify-between gap-3">
        <span className="chip text-sm">Manche {v.idx + 1}/{v.nrounds}</span>
        <span className={`num flex h-14 w-14 items-center justify-center rounded-full border-[3px] text-2xl font-semibold ${urgent ? "border-ko text-ko" : "border-accent text-texte"}`} aria-label={`${Math.ceil(left / 1000)} secondes`}>
          {Math.ceil(left / 1000)}
        </span>
        <span className="chip text-sm">
          <span className="num">{me?.score ?? 0}</span> pts
          {me && me.streak >= 2 && <span className="ml-1 inline-flex items-center gap-0.5 text-energie"><Icon name="flame" size={13} />{me.streak}</span>}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ligne">
        <div className={`h-2.5 rounded-full ${question ? (urgent ? "bg-ko" : "bg-accent") : "bg-ligne-forte"}`} style={{ width: `${(left / total) * 100}%`, transition: "width 100ms linear" }} />
      </div>
      {course && <Piste players={v.players} me={v.me} arrivee={v.arrivee} reveal={!question} />}
      <h2 key={v.idx} className="entree card min-h-20 font-sans text-xl leading-snug font-bold tracking-normal whitespace-pre-line lg:p-6 lg:text-2xl"><Tex>{r.enonce}</Tex></h2>

      <div className={`grid gap-3 ${r.kind === "vf" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
        {r.choices.map((c, i) => {
          const isKey = r.key === i;
          const isMine = chosen === i;
          const k = CASES[i % CASES.length];
          let style: React.CSSProperties = { background: k.fond, boxShadow: `0 4px 0 ${k.ombre}`, color: "#fff" };
          let etat = "";
          if (!question) {
            if (isKey) { style = {}; etat = "border-[3px] border-ok bg-ok-doux text-ok"; }
            else if (isMine) { style = {}; etat = "border-[3px] border-ko bg-ko-doux text-ko"; }
            else { style = {}; etat = "border-2 border-ligne bg-surface text-texte-3 opacity-60"; }
          } else if (chosen !== null && !isMine) etat = "opacity-35";
          else if (isMine) etat = "translate-y-[4px] !shadow-none ring-4 ring-texte/25";
          return (
            <button key={i} disabled={!question || chosen !== null} onClick={() => send(i)} style={style}
              className={`flex min-h-18 items-center gap-3 rounded-[18px] p-4 text-left text-lg font-bold transition-[transform,opacity,box-shadow] duration-100 active:translate-y-[4px] active:shadow-none ${r.kind === "vf" ? "justify-center text-2xl" : ""} ${etat}`}>
              {r.kind !== "vf" && <Forme d={k.forme} />}
              <Tex className="min-w-0 break-words">{c}</Tex>
              {!question && isKey && <Icon name="check" size={22} className="ml-auto shrink-0" label="Bonne réponse" />}
              {!question && isMine && !isKey && <Icon name="x" size={22} className="ml-auto shrink-0" label="Ta réponse" />}
            </button>
          );
        })}
      </div>

      {question ? (
        <p className="text-center text-sm text-texte-2">
          {chosen !== null ? <span className="font-semibold text-accent-fort">Réponse envoyée · </span> : <span className="max-lg:hidden">Touches 1 à 4 · </span>}
          <span className="num">{nAnswered}/{nActive}</span> ont répondu
        </p>
      ) : (
        <div className="space-y-3">
          <div className={`pop flex items-center justify-center gap-2 rounded-[18px] p-4 text-center text-lg font-extrabold ${mine?.ok ? "bg-ok text-sur-ok" : "bg-ko text-sur-ko"}`} role="status">
            <Icon name={mine?.ok ? "check" : mine?.missed ? "clock" : "x"} size={22} />
            {course && mine ? (mine.ok ? <>Bravo ! <span className="num">+{mine.move}</span> case{mine.move > 1 ? "s" : ""}{mine.turbo && <span className="text-base font-bold opacity-90">· turbo</span>}</> : mine.missed ? "Temps écoulé : tu restes sur place" : mine.move < 0 ? "Raté : tu recules d'une case" : "Raté : tu restes sur place")
              : mine?.ok ? <>Bravo ! <span className="num">+{mine.pts}</span>{mine.bonus ? <span className="inline-flex items-center gap-0.5 text-base font-bold opacity-90">(dont <Icon name="flame" size={15} /> +{mine.bonus})</span> : null}</> : mine?.missed ? "Temps écoulé" : "Raté !"}
          </div>
          {r.explication && <p className="card flex items-start gap-2 text-sm text-texte-2"><Icon name="lightbulb" size={17} className="mt-0.5 shrink-0 text-or" /><span><Tex>{r.explication}</Tex></span></p>}
          {!course && <Ranking players={v.players} me={v.me} />}
        </div>
      )}
      {err && <p className="text-center text-sm font-semibold text-ko" role="alert">{err}</p>}
    </Shell>
  );
}

function Ranking({ players, me, changes, course, arrivee }: { players: P[]; me: string; changes?: Record<string, number>; course?: boolean; arrivee?: number }) {
  return (
    <ol className="liste">
      {players.map((p) => (
        <li key={p.id} className={`ligne ${p.id === me ? "bg-accent-doux shadow-[inset_4px_0_0_var(--color-accent)]" : ""} ${p.left ? "opacity-50" : ""}`}>
          <span className={`rang ${p.rank <= 3 ? "text-or" : ""}`}>{p.rank}</span>
          <span className="min-w-0 flex-1 truncate font-semibold">{p.name}{p.id === me && <span className="ml-1.5 text-xs font-bold text-accent-fort">moi</span>}{p.left && <span className="ml-1 text-xs text-texte-3">(parti)</span>}</span>
          {p.round && <span className={`num text-xs font-semibold ${p.round.ok ? "text-ok" : "text-ko"}`}>{p.round.ok ? `+${p.round.pts}` : "✗"}</span>}
          {changes && changes[p.id] !== undefined && (
            <span className={`num text-xs font-semibold ${changes[p.id] >= 0 ? "text-ok" : "text-ko"}`}>{changes[p.id] >= 0 ? "▲" : "▼"}{Math.abs(changes[p.id])}</span>
          )}
          <span className="num w-14 text-right font-semibold">{course ? `${p.pos}/${arrivee}` : p.score}</span>
        </li>
      ))}
    </ol>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-xl space-y-5 px-4 pt-5 pb-16 lg:max-w-3xl lg:space-y-6 lg:pt-10">{children}</main>;
}
