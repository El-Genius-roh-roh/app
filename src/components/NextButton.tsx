import Link from "next/link";

/** Bouton « suivant » posé en bas de page : la prochaine étape logique. */
export default function NextButton({ href, children, sub }: { href: string; children: React.ReactNode; sub?: string }) {
  return (
    <Link href={href} className="btn-primary mt-2 flex-col gap-0 py-4 text-lg">
      <span>{children} →</span>
      {sub && <span className="font-sans text-xs font-semibold text-white/85">{sub}</span>}
    </Link>
  );
}
