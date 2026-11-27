import { LIGUES } from "@/config/constants";
import type { Ligue, LigueInfo, Vitrine as VitrineData } from "@/lib/trophees";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const indexDe = (l: Ligue) => Math.max(0, LIGUES.findIndex((x) => x.nom === l.nom));

/* ------------------------------------------------------------------ icônes trophée et gemme */

/** Coupe dorée (SVG), utilisée pour compter les trophées. */
export function TropheeIcone({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="tr-or" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe7a1" /><stop offset=".5" stopColor="#f0c14b" /><stop offset="1" stopColor="#c99328" />
        </linearGradient>
      </defs>
      <path d="M14 10h-8v6c0 8 6 14 14 15M50 10h8v6c0 8-6 14-14 15" fill="none" stroke="#c99328" strokeWidth="4" strokeLinecap="round" />
      <path d="M14 6h36v12c0 12-8 20-18 20S14 30 14 18z" fill="url(#tr-or)" />
      <path d="M27 37h10l2 9H25z" fill="url(#tr-or)" />
      <rect x="18" y="46" width="28" height="10" rx="3" fill="url(#tr-or)" />
      <path d="M20 10h6v10c0 5 2 8 4 10-6-1-10-6-10-12z" fill="#fff" opacity=".45" />
    </svg>
  );
}

/** Gemme bleue taillée (SVG), monnaie gagnée à chaque quiz. */
export function GemmeIcone({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="gm-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a5d8ff" /><stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path d="M14 22l10-12h16l10 12-18 32z" fill="url(#gm-a)" />
      <path d="M14 22h36M24 10l8 12 8-12M32 22v32" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 10h8l-8 12h-10z" fill="#fff" opacity=".35" />
    </svg>
  );
}

/** Nombre de trophées avec la coupe. */
export function TropheesCompteur({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${className}`}>
      <TropheeIcone />{fmt(n)}
    </span>
  );
}

/** Nombre de gemmes avec la gemme. */
export function GemmesCompteur({ n, className = "", plus = false }: { n: number; className?: string; plus?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${className}`}>
      {plus && "+"}{fmt(n)}<GemmeIcone size={14} />
    </span>
  );
}

/** Pastille « +45 gemmes » (gains d'un quiz), avec la mention du retard s'il y en a. */
export function GainGemmes({ n, retard = 0 }: { n: number; retard?: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700 tabular-nums">
      +{fmt(n)}<GemmeIcone size={13} />{retard > 0 && <span className="font-normal text-slate-500">· rattrapé</span>}
    </span>
  );
}

/** Pastille « +120 trophées » (fin de saison). */
export function GainTrophees({ n, provisoire = false }: { n: number; provisoire?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${provisoire ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>
      +{fmt(n)}<TropheeIcone size={13} />
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
    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
      <LigueBlason ligue={ligue} size={18} />{ligue.nom}
    </span>
  );
}

/** Grande carte « Ma ligue » : blason, trophées, progression vers la ligue suivante. */
export function LigueCard({ info, trophees, serie }: { info: LigueInfo; trophees: number; serie: number }) {
  const { ligue, suivante, progression, manque, index } = info;
  return (
    <section className="card">
      <div className="flex items-center gap-4">
        <LigueBlason ligue={ligue} size={72} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Ligue</p>
          <p className="text-3xl font-bold tracking-tight">{ligue.nom}</p>
          <TropheesCompteur n={trophees} className="mt-1 text-lg text-slate-700" />
        </div>
        {serie > 0 && (
          <div className="shrink-0 text-center">
            <p className="text-2xl font-bold tabular-nums">{serie}</p>
            <p className="text-xs text-slate-500">jour{serie > 1 ? "s" : ""} d&apos;affilée</p>
          </div>
        )}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${Math.round(progression * 100)}%`, background: `linear-gradient(90deg, ${ligue.clair}, ${ligue.fonce})` }} />
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-1 text-sm text-slate-600">
        {suivante ? <>Encore <b className="tabular-nums">{fmt(manque)}</b> <TropheeIcone size={14} /> pour la ligue <b>{suivante.nom}</b></> : "Ligue maximale atteinte."}
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

/** Icône simple (trait) de chaque badge, en attendant de vrais visuels. */
function BadgeIcone({ id, ok }: { id: string; ok: boolean }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const c = `h-7 w-7 ${ok ? "text-accent-600" : "text-slate-300"}`;
  if (id === "premier") return <svg viewBox="0 0 24 24" className={c} {...p}><circle cx="12" cy="9" r="6" /><path d="M9 14.5 7.5 22l4.5-2.5 4.5 2.5-1.5-7.5M12 6.5v5M10.8 7.4 12 6.5" /></svg>;
  if (id === "sans-faute") return <svg viewBox="0 0 24 24" className={c} {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></svg>;
  if (id === "rapide") return <svg viewBox="0 0 24 24" className={c} {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M10 2h4M12 2v3" /></svg>;
  if (id.startsWith("serie")) return <svg viewBox="0 0 24 24" className={c} {...p}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4M8.5 15l2 2 4-4" /></svg>;
  return <svg viewBox="0 0 24 24" className={c} {...p}><path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10M9 8.5h5" /></svg>;
}

/** Badges à débloquer : gagnés en couleur, à débloquer en gris. */
export function Vitrine({ data, titre = "Mes badges" }: { data: VitrineData; titre?: string }) {
  const gagnes = data.trophees.filter((t) => t.nombre > 0).length;
  return (
    <section className="card space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="h2">{titre}</h2>
        <span className="muted">{gagnes}/{data.trophees.length} débloqués</span>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4">
        {data.trophees.map((t) => {
          const ok = t.nombre > 0;
          return (
            <li key={t.id} title={t.description}
              className={`relative flex flex-col items-center gap-1 rounded-2xl p-3 text-center transition ${ok ? "bg-accent-50" : "bg-slate-50"}`}>
              <BadgeIcone id={t.id} ok={ok} />
              {ok && t.cumulable && <span className="absolute top-1.5 right-1.5 rounded-full bg-accent-500 px-1.5 text-[11px] font-semibold text-white">×{t.nombre}</span>}
              <span className={`text-xs leading-tight font-semibold ${ok ? "text-slate-800" : "text-slate-400"}`}>{t.nom}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Mentions des exploits d'un jour (classement du jour). */
export function Exploits({ premier, sansFaute, plusRapide }: { premier: boolean; sansFaute: boolean; plusRapide: boolean }) {
  const l = [premier && "1er", sansFaute && "sans faute", plusRapide && "le + rapide"].filter(Boolean) as string[];
  return <>{l.map((x) => <span key={x} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{x}</span>)}</>;
}
