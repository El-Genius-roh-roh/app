import { LIGUES } from "@/config/constants";
import type { LigueInfo, Ligue, Vitrine as VitrineData } from "@/lib/trophees";

/** Petite pastille de ligue, pour les classements. */
export function LigueBadge({ ligue }: { ligue: Ligue }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${ligue.fond} px-2.5 py-1 text-xs font-extrabold text-white shadow-sm`}>
      <span aria-hidden>{ligue.emoji}</span>{ligue.nom}
    </span>
  );
}

/** Grande carte « Ma ligue » avec la barre de progression vers la ligue suivante. */
export function LigueCard({ info, serie }: { info: LigueInfo; serie: number }) {
  const { ligue, suivante, progression, manque, index } = info;
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${ligue.fond} p-5 text-white shadow-lg lg:p-6`}>
      <div aria-hidden className="pointer-events-none absolute -top-6 -right-4 text-[7rem] leading-none opacity-20 select-none">{ligue.emoji}</div>
      <p className="text-xs font-bold tracking-widest uppercase text-white/80">Ma ligue</p>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-5xl drop-shadow" aria-hidden>{ligue.emoji}</span>
        <div>
          <p className="text-3xl font-black tracking-tight">{ligue.nom}</p>
          {serie > 0 && <p className="text-sm font-bold text-white/90">🔥 {serie} jour{serie > 1 ? "s" : ""} d&apos;affilée</p>}
        </div>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/30">
        <div className="h-3 rounded-full bg-white shadow transition-all" style={{ width: `${Math.round(progression * 100)}%` }} />
      </div>
      <p className="mt-2 text-sm font-semibold text-white/90">
        {suivante ? <>Encore <b>{manque}</b> pts pour {suivante.emoji} <b>{suivante.nom}</b></> : "Ligue maximale atteinte !"}
      </p>
      <div className="mt-3 flex gap-1" aria-label={`Ligue ${index + 1} sur ${LIGUES.length}`}>
        {LIGUES.map((l, i) => (
          <span key={l.nom} title={l.nom} className={`text-lg ${i <= index ? "" : "opacity-30 grayscale"}`}>{l.emoji}</span>
        ))}
      </div>
    </section>
  );
}

/** Vitrine des trophées : gagnés en couleur, à débloquer en gris avec un cadenas. */
export function Vitrine({ data }: { data: VitrineData }) {
  const gagnes = data.trophees.filter((t) => t.nombre > 0).length;
  return (
    <section className="card space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="h2">🏅 Ma vitrine</h2>
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

/** Pastilles des exploits d'un jour (affichées après un quiz et dans le classement du jour). */
export function Exploits({ premier, sansFaute, plusRapide }: { premier: boolean; sansFaute: boolean; plusRapide: boolean }) {
  return (
    <>
      {premier && <span title="1er du jour">🏆</span>}
      {sansFaute && <span title="Sans faute">🎯</span>}
      {plusRapide && <span title="Le plus rapide">⚡</span>}
    </>
  );
}
