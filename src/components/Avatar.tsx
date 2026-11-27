import { url } from "@/lib/url";

// Initiales blanches sur les nuances 700 de la palette (scripts/palette.mjs) : contraste ≥ 4,5:1 dans les deux thèmes.
const FONDS = ["#0a4ac5", "#943501", "#036a34", "#a7001c", "#573f02", "#515962"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Photo de profil ronde, ou initiale sur un fond uni si le joueur n'a pas de photo. */
export default function Avatar({ id, pseudo, v, size = 40, className = "" }: { id: string; pseudo: string; v: number | null | undefined; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (v) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url(`/api/avatars/${id}?v=${v}`)} alt={pseudo} width={size} height={size} style={style}
      className={`shrink-0 rounded-full object-cover ring-2 ring-surface ${className}`} />;
  }
  return (
    <span style={{ ...style, fontSize: size * 0.42, background: FONDS[hash(id) % FONDS.length] }} aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-titre font-extrabold text-white ring-2 ring-surface ${className}`}>
      {(pseudo.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
