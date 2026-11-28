import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LIGUES, TROPHEES } from "@/config/constants";
import { tropheesDuJoueur } from "@/lib/ranking";
import { ligueDe } from "@/lib/trophees";
import { LigueBlason, TropheeIcone } from "@/components/Trophees";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

/** Les ligues (D47) : toutes, avec les trophées qu'il faut pour y entrer, et où en est le joueur. */
export default async function Ligues() {
  const u = await requireUser();
  const { total, enJeu } = await tropheesDuJoueur(u.id);
  const moi = ligueDe(total);
  return (
    <main className="page lg:max-w-3xl">
      <Link href="/?onglet=ligue" className="back"><Icon name="arrowLeft" size={16} />Ligue et succès</Link>
      <header className="entree space-y-1">
        <p className="eyebrow">Ligues</p>
        <h1 className="title">Tu es en ligue {moi.ligue.nom}</h1>
        <p className="muted flex flex-wrap items-center gap-1.5">
          <TropheeIcone size={16} /><b className="num text-texte">{fmt(total)}</b> trophées
          {enJeu > 0 && <> · +<span className="num">{fmt(enJeu)}</span> en jeu dans les saisons en cours</>}
        </p>
      </header>

      <ol className="space-y-2.5">
        {[...LIGUES].map((l, i) => ({ l, i })).reverse().map(({ l, i }) => {
          const atteinte = i <= moi.index;
          const actuelle = i === moi.index;
          const suivante = LIGUES[i + 1];
          return (
            <li key={l.nom} className={`card flex items-center gap-4 ${actuelle ? "ring-2" : ""}`} style={actuelle ? { borderColor: l.clair, boxShadow: `0 0 0 2px ${l.clair}` } : undefined}>
              <LigueBlason ligue={l} size={actuelle ? 56 : 44} verrouille={!atteinte} />
              <div className="min-w-0 flex-1">
                <p className="font-titre text-xl font-extrabold" style={{ color: atteinte ? `light-dark(${l.fonce}, ${l.clair})` : undefined }}>{l.nom}</p>
                <p className="flex flex-wrap items-center gap-1 text-sm text-texte-2">
                  <TropheeIcone size={14} />
                  {suivante ? <>de <b className="num text-texte">{fmt(l.min)}</b> à <span className="num">{fmt(suivante.min - 1)}</span> trophées</> : <>à partir de <b className="num text-texte">{fmt(l.min)}</b> trophées</>}
                </p>
              </div>
              {actuelle
                ? <span className="chip border-transparent bg-accent text-sur-accent">Ta ligue</span>
                : atteinte
                  ? <Icon name="check" size={20} className="text-ok" label="Atteinte" />
                  : <span className="num shrink-0 text-sm text-texte-3">encore {fmt(l.min - total)}</span>}
            </li>
          );
        })}
      </ol>

      <section className="card space-y-2 text-sm text-texte-2">
        <h2 className="h2 text-texte">Comment gagner des trophées</h2>
        <p>Les trophées se gagnent <b className="text-texte">à la fin de la saison de chaque matière</b>, d&apos;après le classement aux gemmes de la saison.</p>
        <p>Chaque joueur gagne <b className="num text-texte">{TROPHEES.PAR_JOUR_PAR_JOUEUR_DERRIERE}</b> trophée × nombre de jours de la saison × nombre de joueurs classés derrière lui. Une longue saison dans un grand groupe rapporte donc plus.</p>
        <p>Les trophées ne se perdent jamais. Ta ligue est <b className="text-texte">unique</b> : elle compte les trophées de toutes tes matières, dans tous tes groupes.</p>
      </section>
    </main>
  );
}
