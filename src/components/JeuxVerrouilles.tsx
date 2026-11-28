import Link from "next/link";
import type { AccesJeux } from "@/lib/acces";
import Icon from "./Icon";

/** Écran affiché à la place d'un jeu tant que le défi du jour n'est pas joué (D45). */
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
          <h1 className="title">D&apos;abord le défi du jour</h1>
        </div>
        <p className="text-[15px] text-texte-2">
          Les jeux s&apos;ouvrent dès que tu as joué {acces.restants > 1 ? <>tes <span className="num">{acces.restants}</span> défis du jour</> : "ton défi du jour"}.
          En attendant, les flashcards et le glossaire sont là pour réviser.
        </p>
        {acces.prochain && (
          <Link href={`/quiz/${acces.prochain.dayId}`} className="btn-primary sm:w-auto"><Icon name="play" size={17} />Jouer le défi · {acces.prochain.matiere}</Link>
        )}
      </section>
    </main>
  );
}
