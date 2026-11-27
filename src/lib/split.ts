// Découpage déterministe du cours en jours (docs/03, étape 3).
export type SplitPage = { id: string; densite: number; chapitre: string | null };

const TOLERANCE_CHAPITRE = 0.25;

/**
 * Répartit des pages contiguës en `nDays` blocs de densité à peu près égale.
 * - cible = densité restante / jours restants, recalculée à chaque jour ;
 * - on préfère couper à une frontière de chapitre si l'écart de densité reste < 25 % ;
 * - les pages de densité 0 suivent la page précédente si elles terminent un bloc de contenu,
 *   sauf si elles ouvrent un chapitre (page de titre) : elles vont alors avec le bloc suivant ;
 * - s'il y a moins de contenu que de jours, les derniers jours sont vides (jours de révision).
 */
export function splitIntoDays(pages: SplitPage[], nDays: number): string[][] {
  const days: string[][] = [];
  let start = 0;
  for (let d = 0; d < nDays; d++) {
    if (start >= pages.length) { days.push([]); continue; }
    if (d === nDays - 1) { days.push(pages.slice(start).map((p) => p.id)); start = pages.length; continue; }

    const remainingDensity = pages.slice(start).reduce((s, p) => s + p.densite, 0);
    const target = remainingDensity / (nDays - d);

    // première coupure candidate : le bloc atteint la cible
    let acc = 0;
    let cut = start;
    while (cut < pages.length) {
      acc += pages[cut].densite;
      cut++;
      if (acc >= target && acc > 0) break;
    }
    // frontières de chapitre : cut' tel que pages[cut'] ouvre un nouveau chapitre
    let best = cut;
    let bestDist = Infinity;
    let a = 0;
    for (let i = start; i < pages.length - 1; i++) {
      a += pages[i].densite;
      const boundary = pages[i + 1].chapitre !== pages[i].chapitre;
      if (!boundary || a === 0) continue;
      if (target > 0 && Math.abs(a - target) / target <= TOLERANCE_CHAPITRE) {
        const dist = Math.abs(i + 1 - cut);
        if (dist < bestDist) { bestDist = dist; best = i + 1; }
      }
    }
    cut = Math.max(best, start + 1);

    // pages de densité 0 en tête du bloc suivant : elles restent avec lui (pas de rattachement arrière)
    days.push(pages.slice(start, cut).map((p) => p.id));
    start = cut;
  }
  return days;
}
