import Link from "next/link";
import Icon from "./Icon";

/** Écran affiché à la place d'une fonction premium (D42) pour un compte gratuit : ce qu'elle apporte, et où l'activer. */
export default function PremiumRequis({ titre, texte, retour }: { titre: string; texte: string; retour?: { href: string; label: string } }) {
  return (
    <main className="page lg:max-w-3xl">
      {retour && <Link href={retour.href} className="back"><Icon name="arrowLeft" size={16} />{retour.label}</Link>}
      <section className="card entree space-y-4 border-or/40">
        <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-xl bg-or-vif text-sur-or shadow-[0_3px_0_var(--color-or)]">
          <Icon name="sparkles" size={24} />
        </span>
        <div className="space-y-1">
          <p className="eyebrow">Réservé aux comptes premium</p>
          <h1 className="title">{titre}</h1>
        </div>
        <p className="text-[15px] text-texte-2">{texte}</p>
        <ul className="space-y-1.5 text-sm text-texte-2">
          <li className="flex items-center gap-2"><Icon name="cards" size={16} className="text-accent-fort" />Flashcards sur les notions du cours et les quiz passés</li>
          <li className="flex items-center gap-2"><Icon name="swords" size={16} className="text-energie" />L&apos;Arène : duels en direct, parties contre des bots, jeu de plateau</li>
        </ul>
        <p className="text-sm text-texte-3">Le défi du jour, le Memory et Relier restent gratuits pour tout le monde.</p>
        <Link href="/profil#premium" className="btn-primary sm:w-auto"><Icon name="sparkles" size={17} />Passer en premium</Link>
      </section>
    </main>
  );
}
