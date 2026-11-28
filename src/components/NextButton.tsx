import Link from "next/link";
import Icon from "./Icon";

/** Lien « étape suivante » posé en bas de page. */
export default function NextButton({ href, children, sub }: { href: string; children: React.ReactNode; sub?: string }) {
  return (
    <Link href={href} className="tuile group flex items-center justify-between gap-3">
      <span className="min-w-0">
        {sub && <span className="eyebrow block">{sub}</span>}
        <span className="block truncate font-titre text-lg">{children}</span>
      </span>
      <Icon name="arrowRight" className="text-texte-3 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-accent" />
    </Link>
  );
}
