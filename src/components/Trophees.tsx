import { LIGUES } from "@/config/constants";
import type { Ligue, LigueInfo, Vitrine as VitrineData } from "@/lib/trophees";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const indexDe = (l: Ligue) => Math.max(0, LIGUES.findIndex((x) => x.nom === l.nom));

/* ------------------------------------------------------------------ icône trophée */

/** Coupe dorée (SVG), utilisée pour compter les trophées. */
export function TropheeIcone({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="tr-or" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1a8" /><stop offset=".45" stopColor="#ffc93c" /><stop offset="1" stopColor="#c27c00" />
        </linearGradient>
      </defs>
      <path d="M14 10h-8v6c0 8 6 14 14 15M50 10h8v6c0 8-6 14-14 15" fill="none" stroke="#c27c00" strokeWidth="4" strokeLinecap="round" />
      <path d="M14 6h36v12c0 12-8 20-18 20S14 30 14 18z" fill="url(#tr-or)" stroke="#9a6200" strokeWidth="2" />
      <path d="M27 37h10l2 9H25z" fill="url(#tr-or)" stroke="#9a6200" strokeWidth="2" />
      <rect x="18" y="46" width="28" height="10" rx="3" fill="url(#tr-or)" stroke="#9a6200" strokeWidth="2" />
      <path d="M20 10h6v10c0 5 2 8 4 10-6-1-10-6-10-12z" fill="#fff" opacity=".45" />
    </svg>
  );
}

/** « 🏆 1 240 » avec la coupe dessinée. */
export function TropheesCompteur({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-extrabold tabular-nums ${className}`}>
      <TropheeIcone />{fmt(n)}
    </span>
  );
}

/** Variation du jour : +40 en vert, −20 en rouge. */
export function DeltaTrophees({ d }: { d: number }) {
  const cls = d > 0 ? "bg-emerald-100 text-emerald-700" : d < 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold tabular-nums ${cls}`}>
      {d > 0 ? "+" : d < 0 ? "−" : "±"}{fmt(Math.abs(d))}<TropheeIcone size={14} />
    </span>
  );
}

/* ------------------------------------------------------------------ blasons de ligue */

/** Emblème au centre du blason, de plus en plus riche selon la ligue. */
function Embleme({ index, fill, stroke }: { index: number; fill: string; stroke: string }) {
  const p = { fill, stroke, strokeWidth: 2.5, strokeLinejoin: "round" as const };
  const chevron = (dy: number) => <path d={`M31 ${48 + dy}l19 11 19-11v10l-19 11-19-11z`} {...p} />;
  const etoile = <path d="M50 37l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L50 65.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" {...p} />;
  const gemme = (
    <g {...p}>
      <path d="M38 47l6-8h12l6 8-12 22z" />
      <path d="M38 47h24M44 39l6 8 6-8M50 47v22" fill="none" strokeWidth={1.6} />
    </g>
  );
  switch (index) {
    case 0: return chevron(4);
    case 1: return <>{chevron(-3)}{chevron(11)}</>;
    case 2: return etoile;
    case 3: return (
      <>
        <path d="M27 72c-6-10-5-22 3-30M73 72c6-10 5-22-3-30" fill="none" stroke={stroke} strokeWidth={6} strokeLinecap="round" />
        <path d="M27 72c-6-10-5-22 3-30M73 72c6-10 5-22-3-30" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
        {etoile}
      </>
    );
    case 4: return <g transform="translate(-10 -6) scale(1.2)">{gemme}</g>;
    default: return (
      <>
        <path d="M27 72c-6-10-5-22 3-30M73 72c6-10 5-22-3-30" fill="none" stroke={stroke} strokeWidth={6} strokeLinecap="round" />
        <path d="M27 72c-6-10-5-22 3-30M73 72c6-10 5-22-3-30" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
        <g transform="translate(-10 -8) scale(1.2)">{gemme}</g>
      </>
    );
  }
}

/** Blason d'une ligue (SVG) : bouclier métallique aux couleurs de la ligue, couronne pour la ligue Maître. */
export function LigueBlason({ ligue, size = 48, verrouille = false }: { ligue: Ligue; size?: number; verrouille?: boolean }) {
  const i = indexDe(ligue);
  const g = `lg-${i}`;
  const maitre = i === LIGUES.length - 1;
  return (
    <svg width={size} height={size * 1.2} viewBox="0 -18 100 134" aria-label={`Ligue ${ligue.nom}`} role="img"
      className={`inline-block shrink-0 drop-shadow-sm ${verrouille ? "opacity-35 grayscale" : ""}`}>
      <defs>
        <linearGradient id={`${g}-m`} x1="0" y1="0" x2=".3" y2="1">
          <stop offset="0" stopColor={ligue.clair} /><stop offset=".55" stopColor={ligue.clair} stopOpacity=".85" /><stop offset="1" stopColor={ligue.fonce} />
        </linearGradient>
        <linearGradient id={`${g}-i`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ligue.fonce} /><stop offset="1" stopColor="#140a2e" stopOpacity=".9" />
        </linearGradient>
        <linearGradient id={`${g}-c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" /><stop offset="1" stopColor="#d99a00" />
        </linearGradient>
      </defs>
      {maitre && (
        <path d="M26 6l6-20 10 12 8-16 8 16 10-12 6 20z" fill={`url(#${g}-c)`} stroke="#8a5a00" strokeWidth="2.5" strokeLinejoin="round" />
      )}
      <path d="M50 3l43 13v40c0 28-19 46-43 57C26 102 7 84 7 56V16z" fill={`url(#${g}-m)`} stroke={ligue.fonce} strokeWidth="3" />
      <path d="M50 14l33 10v32c0 21-14 35-33 44-19-9-33-23-33-44V24z" fill={`url(#${g}-i)`} />
      <Embleme index={i} fill={`url(#${g}-m)`} stroke={ligue.fonce} />
      {maitre && <circle cx="50" cy="84" r="5" fill={`url(#${g}-c)`} stroke="#8a5a00" strokeWidth="2" />}
      <path d="M50 14l33 10v14c-14-4-46 4-66 14V24z" fill="#fff" opacity=".18" />
    </svg>
  );
}

/** Pastille de ligue pour les classements : petit blason + nom. */
export function LigueBadge({ ligue }: { ligue: Ligue }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-slate-700">
      <LigueBlason ligue={ligue} size={18} />{ligue.nom}
    </span>
  );
}

/** Grande carte « Ma ligue » : blason, trophées, progression vers la ligue suivante. */
export function LigueCard({ info, trophees, serie }: { info: LigueInfo; trophees: number; serie: number }) {
  const { ligue, suivante, progression, manque, index } = info;
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${ligue.fond} p-5 text-white shadow-lg lg:p-6`}>
      <div className="flex items-center gap-4">
        <LigueBlason ligue={ligue} size={76} />
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-widest uppercase text-white/80">Ligue</p>
          <p className="text-3xl font-black tracking-tight drop-shadow-sm">{ligue.nom}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-lg font-black tabular-nums">
            <TropheeIcone size={22} />{fmt(trophees)}
          </p>
        </div>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/20">
        <div className="h-3 rounded-full bg-gradient-to-r from-yellow-200 to-white shadow transition-all" style={{ width: `${Math.round(progression * 100)}%` }} />
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-1 text-sm font-semibold text-white/90">
        {suivante ? <>Encore <b className="tabular-nums">{fmt(manque)}</b> <TropheeIcone size={14} /> pour la ligue <b>{suivante.nom}</b></> : "Ligue maximale atteinte !"}
        {serie > 0 && <span className="ml-auto rounded-full bg-black/20 px-2 py-0.5">🔥 {serie} jour{serie > 1 ? "s" : ""}</span>}
      </p>
      <div className="mt-3 flex items-end gap-1.5" aria-label={`Ligue ${index + 1} sur ${LIGUES.length}`}>
        {LIGUES.map((l, i) => (
          <span key={l.nom} title={`${l.nom} · ${fmt(l.min)} trophées`}><LigueBlason ligue={l} size={i === index ? 30 : 22} verrouille={i > index} /></span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ badges */

/** Badges à débloquer : gagnés en couleur, à débloquer en gris avec un cadenas. */
export function Vitrine({ data, titre = "🎖️ Mes badges" }: { data: VitrineData; titre?: string }) {
  const gagnes = data.trophees.filter((t) => t.nombre > 0).length;
  return (
    <section className="card space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="h2">{titre}</h2>
        <span className="muted font-semibold">{gagnes}/{data.trophees.length} débloqués</span>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        {data.trophees.map((t) => {
          const ok = t.nombre > 0;
          return (
            <li key={t.id} title={t.description}
              className={`relative flex flex-col items-center rounded-2xl p-3 text-center transition ${ok ? "bg-gradient-to-b from-amber-50 to-orange-100 shadow-sm ring-1 ring-amber-200" : "bg-slate-50"}`}>
              <span className={`text-3xl ${ok ? "drop-shadow" : "opacity-30 grayscale"}`} aria-hidden>{t.emoji}</span>
              {!ok && <span className="absolute top-1.5 right-2 text-xs" aria-hidden>🔒</span>}
              {ok && t.cumulable && <span className="absolute top-1.5 right-1.5 rounded-full bg-fuchsia-600 px-1.5 text-[11px] font-black text-white">×{t.nombre}</span>}
              <span className={`mt-1 text-xs leading-tight font-extrabold ${ok ? "text-slate-800" : "text-slate-400"}`}>{t.nom}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Pastilles des exploits d'un jour (classement du jour). */
export function Exploits({ premier, sansFaute, plusRapide }: { premier: boolean; sansFaute: boolean; plusRapide: boolean }) {
  return (
    <>
      {premier && <span title="1er du jour">🥇</span>}
      {sansFaute && <span title="Sans faute">🎯</span>}
      {plusRapide && <span title="Le plus rapide">⚡</span>}
    </>
  );
}
