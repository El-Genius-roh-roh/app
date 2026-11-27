import Link from "next/link";

/** Lien « étape suivante » posé en bas de page. */
export default function NextButton({ href, children, sub }: { href: string; children: React.ReactNode; sub?: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between rounded-xl border border-trait bg-carte px-4 py-3.5 hover:border-encre">
      <span>
        {sub && <span className="eyebrow block">{sub}</span>}
        <span className="font-titre text-lg font-bold">{children}</span>
      </span>
      <span aria-hidden className="text-xl text-encre-3 transition-transform group-hover:translate-x-0.5 group-hover:text-accent">→</span>
    </Link>
  );
}
