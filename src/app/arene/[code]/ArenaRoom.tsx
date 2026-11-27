"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { url } from "@/lib/url";
import Tex from "@/components/Tex";

type P = {
  id: string; name: string; bot: boolean; left: boolean; host: boolean; score: number; streak: number; rank: number;
  answered: boolean; round?: { ok: boolean; pts: number; bonus: number; missed: boolean; choice: number | null };
};
type View = {
  v: number; now: number; code: string; phase: "lobby" | "question" | "reveal" | "final"; modeTitre: string; host: string; me: string;
  idx: number; nrounds: number; deadline: number; phaseStart: number; revealMs: number; players: P[];
  round?: { kind: "qcm" | "vf"; enonce: string; choices: string[]; limitMs: number; key?: number; explication?: string };
  my?: { answered: boolean; choice: number | null };
  final?: { changes: Record<string, number>; recap: { enonce: string; bonne: string; explication: string; ok: boolean; pts: number }[] };
};

const COLORS = ["bg-rose-500", "bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-violet-500", "bg-pink-500"];
const SHAPES = ["▲", "◆", "●", "■", "★", "⬟"];

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
    <Shell><p className="text-red-200">{err ?? "Partie fermée."}</p><Link href="/arene" className="underline">← Retour à l&apos;Arène</Link></Shell>
  );
  if (!v) return <Shell><p className="animate-pulse">Connexion à la partie…</p></Shell>;

  const now = Date.now() + offset.current;
  const meHost = v.host === v.me;
  const me = v.players.find((p) => p.id === v.me);

  /* ------------------------------------------------ salon d'attente */
  if (v.phase === "lobby") {
    const humans = v.players.filter((p) => !p.bot).length;
    return (
      <Shell>
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest opacity-80">Code de la partie</p>
          <p className="text-6xl font-black tracking-[0.3em]">{v.code}</p>
          <p className="mt-1 text-sm opacity-80">{v.modeTitre} · {v.nrounds} manches</p>
        </div>
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {v.players.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 rounded-xl bg-white/15 p-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${COLORS[i % COLORS.length]}`}>{p.name[0]}</span>
              <span className="truncate">{p.name}{p.host && " 👑"}</span>
            </li>
          ))}
        </ul>
        {meHost ? (
          <div className="space-y-2">
            <button onClick={() => act("bot")} className="w-full rounded-xl bg-white/20 p-3">+ Ajouter un bot 🤖</button>
            <button onClick={() => act("start")} className="w-full rounded-xl bg-emerald-400 p-4 text-lg font-black text-emerald-950 shadow-lg">
              Lancer la partie ({v.players.length} joueur{v.players.length > 1 ? "s" : ""})
            </button>
            {humans < 2 && <p className="text-center text-xs opacity-80">Partage le code à tes amis, ou ajoute des bots pour t&apos;entraîner.</p>}
          </div>
        ) : <p className="animate-pulse text-center">En attente du lancement par l&apos;hôte…</p>}
        <button onClick={() => act("leave").then(() => (location.href = url("/arene")))} className="text-sm underline opacity-80">Quitter</button>
        {err && <p className="text-center text-sm text-red-200">{err}</p>}
      </Shell>
    );
  }

  /* ------------------------------------------------ podium final */
  if (v.phase === "final") {
    const top = v.players.slice(0, 3);
    const order = [1, 0, 2].filter((i) => top[i]);
    const delta = v.final?.changes[v.me];
    return (
      <Shell>
        <h1 className="text-center text-3xl font-black">🏁 Fin de la partie</h1>
        <div className="flex items-end justify-center gap-2">
          {order.map((i) => (
            <div key={top[i].id} className="flex w-24 flex-col items-center">
              <span className="text-3xl">{["🥇", "🥈", "🥉"][i]}</span>
              <span className="w-full truncate text-center text-sm font-semibold">{top[i].name}</span>
              <div className={`mt-1 w-full rounded-t-lg bg-white/25 text-center font-bold ${["h-28", "h-20", "h-14"][i]} pt-2`}>{top[i].score}</div>
            </div>
          ))}
        </div>
        {delta !== undefined && (
          <p className="text-center text-lg">Ta ligue : <b className={delta >= 0 ? "text-emerald-300" : "text-rose-300"}>{delta >= 0 ? "+" : ""}{delta} pts</b></p>
        )}
        <Ranking players={v.players} me={v.me} changes={v.final?.changes} />
        {v.final && v.final.recap.some((r) => !r.ok) && (
          <section className="space-y-2 rounded-xl bg-white p-3 text-gray-900">
            <h2 className="font-bold">📚 À revoir</h2>
            {v.final.recap.filter((r) => !r.ok).map((r, i) => (
              <div key={i} className="border-t pt-2 text-sm">
                <p className="whitespace-pre-line font-medium"><Tex>{r.enonce}</Tex></p>
                <p className="text-emerald-700">✓ <Tex>{r.bonne}</Tex></p>
                {r.explication && <p className="text-gray-600"><Tex>{r.explication}</Tex></p>}
              </div>
            ))}
          </section>
        )}
        <Link href="/arene" className="block rounded-xl bg-emerald-400 p-3 text-center text-emerald-950">Rejouer / retour à l&apos;Arène</Link>
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

  return (
    <Shell>
      <div className="flex items-center justify-between text-sm">
        <span className="rounded-full bg-white/20 px-3 py-1">Manche {v.idx + 1}/{v.nrounds}</span>
        <span className="font-mono text-2xl font-black">{Math.ceil(left / 1000)}</span>
        <span className="rounded-full bg-white/20 px-3 py-1">{me?.score ?? 0} pts{me && me.streak >= 2 ? ` · 🔥${me.streak}` : ""}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-white/20">
        <div className={`h-2 ${question ? "bg-emerald-300" : "bg-white/60"}`} style={{ width: `${(left / total) * 100}%`, transition: "width 100ms linear" }} />
      </div>
      <h2 className="min-h-20 whitespace-pre-line rounded-2xl bg-white p-4 text-lg font-bold text-gray-900 shadow lg:p-6 lg:text-2xl"><Tex>{r.enonce}</Tex></h2>

      <div className={`grid gap-3 ${r.kind === "vf" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
        {r.choices.map((c, i) => {
          const isKey = r.key === i;
          const isMine = chosen === i;
          let cls = r.kind === "vf" ? (i === 0 ? "bg-emerald-500" : "bg-rose-500") : COLORS[i % COLORS.length];
          if (!question) cls = isKey ? "bg-emerald-500 ring-4 ring-white" : isMine ? "bg-rose-700 opacity-80" : "bg-gray-500 opacity-40";
          else if (chosen !== null && !isMine) cls += " opacity-40";
          return (
            <button key={i} disabled={!question || chosen !== null} onClick={() => send(i)}
              className={`${cls} flex min-h-16 items-center gap-3 rounded-2xl p-4 text-left text-white shadow-lg transition active:scale-95 ${r.kind === "vf" ? "justify-center text-2xl" : ""}`}>
              {r.kind !== "vf" && <span className="text-xl opacity-80">{SHAPES[i]}</span>}
              <Tex className="min-w-0 break-words">{c}</Tex>
              {!question && isKey && <span className="ml-auto">✓</span>}
            </button>
          );
        })}
      </div>

      {question ? (
        <p className="text-center text-sm opacity-90">
          {chosen !== null ? "Réponse envoyée ✔ " : "Touche 1-4 ou clique "}· {nAnswered}/{nActive} ont répondu
        </p>
      ) : (
        <div className="space-y-3">
          <div className={`rounded-2xl p-3 text-center text-lg font-black ${mine?.ok ? "bg-emerald-400 text-emerald-950" : "bg-rose-500"}`}>
            {mine?.ok ? `Bravo ! +${mine.pts}${mine.bonus ? ` (dont 🔥 +${mine.bonus})` : ""}` : mine?.missed ? "Temps écoulé…" : "Raté !"}
          </div>
          {r.explication && <p className="rounded-xl bg-white/15 p-3 text-sm">💡 <Tex>{r.explication}</Tex></p>}
          <Ranking players={v.players} me={v.me} />
        </div>
      )}
      {err && <p className="text-center text-sm text-red-200">{err}</p>}
    </Shell>
  );
}

function Ranking({ players, me, changes }: { players: P[]; me: string; changes?: Record<string, number> }) {
  return (
    <ol className="space-y-1">
      {players.map((p) => (
        <li key={p.id} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${p.id === me ? "bg-white text-gray-900 font-bold" : "bg-white/10"} ${p.left ? "opacity-50" : ""}`}>
          <span className="w-6">{p.rank}</span>
          <span className="flex-1 truncate">{p.name}{p.left && " (parti)"}</span>
          {p.round && <span className="text-xs">{p.round.ok ? `+${p.round.pts}` : "✗"}</span>}
          {changes && changes[p.id] !== undefined && (
            <span className={`text-xs ${changes[p.id] >= 0 ? "text-emerald-500" : "text-rose-400"}`}>{changes[p.id] >= 0 ? "▲" : "▼"}{Math.abs(changes[p.id])}</span>
          )}
          <span className="w-14 text-right font-mono">{p.score}</span>
        </li>
      ))}
    </ol>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 text-white">
      <div className="mx-auto max-w-xl space-y-4 p-4 lg:max-w-3xl lg:space-y-6 lg:pt-10">{children}</div>
    </main>
  );
}
