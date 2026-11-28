import Link from "next/link";
import type { AccesJeux } from "@/lib/acces";
import Icon from "./Icon";

/** Écran affiché à la place de l'Arène (et du jeu de plateau) tant que tous les jeux du jour ne sont pas joués (D45, D49). */
export default function JeuxVerrouilles({ jeu, acces, retour }: { jeu: string; acces: AccesJeux; retour?: { href: string; label: string } }) {
  return (
    <main className="page lg:max-w-3xl">
      {retour && <Link href={retour.href} className="back"><Icon name="arrowLeft" size={16} />{retour.label}</Link>}
      <section className="card entree space-y-4">
        <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-xl bg-energie text-sur-energie shadow-[0_3px_0_color-mix(in_oklab,var(--color-energie)_55%,black)]">
          <Icon name="flame" size={24} />
        </span>
        <div className="space-y-1">
          <p className="eyebrow">{jeu} · verrouillé pour aujourd&apos;hui</p>
          <h1 className="title">D&apos;abord tes jeux du jour</h1>
        </div>
        <p className="text-[15px] text-texte-2">
          {jeu} s&apos;ouvre dès que tu as joué {acces.restants > 1 ? <>tes <span className="num">{acces.restants}</span> jeux du jour</> : "ton jeu du jour"}.
          Tout le reste reste ouvert : flashcards, Memory et Relier en solo, classements, ligue.
        </p>
        {acces.prochain && (
          <Link href={`/quiz/${acces.prochain.dayId}`} className="btn-primary sm:w-auto"><Icon name="play" size={17} />Jouer le jeu du jour · {acces.prochain.matiere}</Link>
        )}
      </section>
    </main>
  );
}
