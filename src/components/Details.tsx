import Icon from "./Icon";

/** Texte explicatif masqué par défaut derrière un bouton « Détails » discret. */
export default function Details({ label = "Détails", children, className = "", inverted = false }: { label?: string; children: React.ReactNode; className?: string; inverted?: boolean }) {
  return (
    <details className={`group/det text-xs ${inverted ? "text-current opacity-90" : "text-texte-3"} ${className}`}>
      <summary className={`inline-flex cursor-pointer items-center gap-1 font-medium transition-colors select-none ${inverted ? "hover:opacity-100" : "hover:text-texte"}`}>
        <span>{label}</span>
        <Icon name="chevronRight" size={13} className="transition-transform group-open/det:rotate-90" />
      </summary>
      <div className="mt-1.5 leading-relaxed">{children}</div>
    </details>
  );
}
