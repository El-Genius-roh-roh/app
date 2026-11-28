// Tableau de bord personnel (D38) : défis du jour, mon classement, mes succès.
import Link from "next/link";
import type { Defi, Succes as SuccesData } from "@/lib/succes";
import type { ClassementGroupe } from "@/lib/tableau";
import { GainTrophees, TropheesCompteur } from "./Trophees";
import Icon from "./Icon";
import Details from "./Details";

const MODE = { quiz: { label: "Quiz", cls: "bg-accent-doux text-accent-fort" }, solo: { label: "Solo", cls: "bg-or-doux text-or" }, multi: { label: "Multi", cls: "bg-energie-doux text-energie" } } as const;
const ICONE_DEFI: Record<string, string> = { quiz: "play", flashcards: "cards", memory: "target", arene: "swords" };

/** Défis du jour : à cocher en jouant (quiz, solo, multi). */
export function Defis({ defis }: { defis: Defi[] }) {
  const faits = defis.filter((d) => d.fait).length;
  const tout = faits === defis.length;
  return (
    <section className="card space-y-3" aria-labelledby="t-defis">
      <div className="flex items-center justify-between gap-3">
        <h2 id="t-defis" className="h2 flex items-center gap-2"><Icon name="target" size={20} className="text-accent" />Défis du jour</h2>
        <span className={`num rounded-full px-2.5 py-0.5 text-sm font-semibold ${tout ? "bg-ok-doux text-ok" : "bg-surface-2 text-texte-2"}`}>{faits}/{defis.length}</span>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {defis.map((d) => <span key={d.id} className={`h-2 flex-1 rounded-full transition-colors ${d.fait ? "bg-ok" : "bg-ligne"}`} />)}
      </div>
      <ul className="space-y-1.5">
        {defis.map((d) => (
          <li key={d.id}>
            <Link href={d.href} className={`group flex min-h-14 items-center gap-3 rounded-[14px] px-2 py-1.5 transition-colors hover:bg-surface-2 ${d.fait ? "opacity-75" : ""}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${d.fait ? "border-ok bg-ok text-sur-ok" : "border-ligne text-texte-3"}`}>
                <Icon name={d.fait ? "check" : ICONE_DEFI[d.id] ?? "play"} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold ${d.fait ? "text-texte-2 line-through decoration-2 decoration-ok/60" : ""}`}>{d.titre}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-texte-3">
                  <span className={`rounded-full px-1.5 py-px text-[10.5px] font-bold uppercase ${MODE[d.mode].cls}`}>{MODE[d.mode].label}</span>{d.detail}
                </span>
              </span>
              {!d.fait && <Icon name="chevronRight" size={18} className="text-texte-3 transition-transform group-hover:translate-x-0.5" />}
            </Link>
          </li>
        ))}
      </ul>
      {tout && <p className="flex items-center gap-1.5 text-sm font-semibold text-ok"><Icon name="sparkles" size={16} />Tous les défis du jour sont relevés. Bravo !</p>}
    </section>
  );
}

const rangTexte = (r: number) => (r === 1 ? "1er" : `${r}e`);

/** Mon classement : dans chaque groupe, ma place aux trophées (gagnés dans ses matières) et ceux en jeu. */
export function MonClassement({ classements }: { classements: ClassementGroupe[] }) {
  if (!classements.length) return null;
  return (
    <section className="space-y-3" aria-labelledby="t-classement">
      <h2 id="t-classement" className="h2">Mon classement par groupe</h2>
      <ul className="liste">
        {classements.map((c) => {
          const l = c.ligne;
          return (
            <li key={c.groupId}>
              <Link href={`/groupes/${c.groupId}?onglet=competitif`} className="ligne group min-h-16 transition-colors hover:bg-surface-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{c.nom}</span>
                  <span className="block text-sm text-texte-2">
                    {l && l.trophees > 0
                      ? <><span className="num font-semibold text-texte">{rangTexte(l.rang)}</span> sur <span className="num">{c.membres}</span> aux trophées</>
                      : "Pas encore de trophée dans ce groupe"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <TropheesCompteur n={l?.trophees ?? 0} className="text-sm text-or" />
                  {c.enJeu > 0 && <GainTrophees n={c.enJeu} provisoire />}
                </span>
                <Icon name="chevronRight" size={18} className="text-texte-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
      <Details>Les trophées se gagnent à la fin de la saison de chaque matière ; « en jeu » : ce que tu gagnerais si les saisons en cours s&apos;arrêtaient aujourd&apos;hui.</Details>
    </section>
  );
}

/** Mes succès : médailles débloquées en couleur, les autres en gris avec leur progression. */
export function MesSucces({ succes }: { succes: SuccesData[] }) {
  const obtenus = succes.filter((s) => s.obtenu).length;
  const tries = [...succes].sort((a, b) => +b.obtenu - +a.obtenu);
  return (
    <section className="card space-y-3" aria-labelledby="t-succes">
      <div className="flex items-baseline justify-between">
        <h2 id="t-succes" className="h2">Mes succès</h2>
        <span className="num text-sm text-texte-3">{obtenus}/{succes.length}</span>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
        {tries.map((s) => (
          <li key={s.id} title={s.description}
            className={`relative flex flex-col items-center gap-1 rounded-[14px] border-2 p-2.5 text-center ${s.obtenu ? "border-or/35 bg-or-doux" : "border-ligne bg-surface-2"}`}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${s.obtenu ? "bg-or-vif text-sur-or shadow-[0_2px_0_color-mix(in_oklab,var(--color-or)_60%,black)]" : "bg-surface text-texte-3"}`}>
              <Icon name={s.icone} size={20} />
            </span>
            {s.obtenu && (s.nombre ?? 0) > 1 && <span className="absolute top-1 right-1 rounded-full bg-or px-1.5 font-num text-[11px] font-bold text-fond">×{s.nombre}</span>}
            {s.titre && s.obtenu && <span className="absolute top-1 left-1 rounded-full bg-accent px-1.5 text-[9.5px] font-bold text-sur-accent uppercase">Titre</span>}
            <span className={`text-[11.5px] leading-tight font-semibold ${s.obtenu ? "text-texte" : "text-texte-3"}`}>{s.nom}</span>
            {!s.obtenu && s.progres && (
              <span className="w-full space-y-0.5">
                <span className="block h-1.5 overflow-hidden rounded-full bg-ligne"><span className="block h-full rounded-full bg-or" style={{ width: `${(100 * s.progres.n) / s.progres.cible}%` }} /></span>
                <span className="num block text-[10.5px] text-texte-3">{s.progres.n}/{s.progres.cible}</span>
              </span>
            )}
            <span className="sr-only">{s.description}. {s.obtenu ? "Débloqué" : "À débloquer"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
