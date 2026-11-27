import { texParts } from "@/lib/tex";

/** Texte avec formules LaTeX ($…$, $$…$$, \(…\), \[…\]). Utilisable côté serveur comme côté client. */
export default function Tex({ children, className }: { children: string; className?: string }) {
  const parts = texParts(children ?? "");
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.math
          ? <span key={i} className={p.display ? "my-1 block overflow-x-auto" : "inline-block max-w-full overflow-x-auto align-middle"} dangerouslySetInnerHTML={{ __html: p.html }} />
          : <span key={i}>{p.text}</span>,
      )}
    </span>
  );
}
