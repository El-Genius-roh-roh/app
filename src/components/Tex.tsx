import { texParts } from "@/lib/tex";

/** Texte avec formules LaTeX ($…$, $$…$$, \(…\), \[…\]). Utilisable côté serveur comme côté client. */
export default function Tex({ children, className = "" }: { children: string; className?: string }) {
  const parts = texParts(children ?? "");
  // aucune barre de défilement : les formules longues passent à la ligne (rendu en ligne, centré pour $$…$$)
  return (
    <span className={`tex ${className}`}>
      {parts.map((p, i) =>
        p.math
          ? <span key={i} className={p.display ? "tex-bloc" : undefined} dangerouslySetInnerHTML={{ __html: p.html }} />
          : <span key={i}>{p.text}</span>,
      )}
    </span>
  );
}
