import { url } from "@/lib/url";

// Initiales sur des fonds sourds bleutés : distincts entre eux sans concurrencer l'accent ni l'or.
const FONDS = ["#24324a", "#2b3d3a", "#3b3348", "#433a2c", "#2c3a4f", "#3d2f36"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Photo de profil ronde, ou initiale sur un fond uni si le joueur n'a pas de photo. */
export default function Avatar({ id, pseudo, v, size = 40, className = "" }: { id: string; pseudo: string; v: number | null | undefined; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (v) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url(`/api/avatars/${id}?v=${v}`)} alt={pseudo} width={size} height={size} style={style}
      className={`shrink-0 rounded-full object-cover ring-1 ring-ligne ${className}`} />;
  }
  return (
    <span style={{ ...style, fontSize: size * 0.42, background: FONDS[hash(id) % FONDS.length] }} aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-titre text-texte ring-1 ring-ligne ${className}`}>
      {(pseudo.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
