import { url } from "@/lib/url";

const FONDS = ["from-accent-400 to-accent-600", "from-orange-500 to-amber-400", "from-sky-500 to-cyan-400", "from-emerald-500 to-lime-400", "from-rose-500 to-pink-400"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Photo de profil ronde, ou initiale sur un dégradé si le joueur n'a pas de photo. */
export default function Avatar({ id, pseudo, v, size = 40, className = "" }: { id: string; pseudo: string; v: number | null | undefined; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (v) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url(`/api/avatars/${id}?v=${v}`)} alt={pseudo} width={size} height={size} style={style}
      className={`shrink-0 rounded-full object-cover ring-2 ring-white/80 shadow ${className}`} />;
  }
  return (
    <span style={{ ...style, fontSize: size * 0.45 }} aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${FONDS[hash(id) % FONDS.length]} font-titre font-bold text-white ring-2 ring-white/80 shadow ${className}`}>
      {(pseudo.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
