import Link from "next/link";
import { avatarsOf } from "@/lib/avatar";
import Avatar from "./Avatar";
import Icon from "./Icon";

/** Rang : 1-2-3 en or / argent / bronze (chiffres de tableau d'affichage), les autres en gris. */
const PODIUM = ["text-or", "text-argent", "text-bronze"];
const MARCHES = [
  { h: "h-24", c: "bg-or-vif text-sur-or" },
  { h: "h-[4.5rem]", c: "bg-ligne-forte text-texte" },
  { h: "h-12", c: "bg-[#b0703a] text-white" },
];

export function RankBadge({ rang }: { rang: number }) {
  return <span className={`rang ${rang <= 3 ? PODIUM[rang - 1] : ""}`}>{rang}</span>;
}

export const fmtMs = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s} s`;
};

/** `badge` remplace l'ancien affichage des points (ligue, exploits du jour…). */
type Line = { userId: string; pseudo: string; rang: number; detail?: string; badge?: React.ReactNode };

/** Classement : podium 3D optionnel (2-1-3) pour les 3 premiers, puis liste par joueur. */
export default async function RankTable({ lines, meId, groupId, empty, podium = false }: { lines: Line[]; meId: string; groupId: string; empty?: string; podium?: boolean }) {
  if (lines.length === 0) return <p className="muted">{empty ?? "Pas encore de classement."}</p>;
  const avatars = await avatarsOf(lines.map((l) => l.userId));
  const tries = [...lines].sort((a, b) => a.rang - b.rang);
  const top3 = podium && tries.length >= 2 ? tries.slice(0, 3) : [];
  const ordre = [1, 0, 2].filter((i) => top3[i]);
  const reste = top3.length > 0 ? tries.slice(3) : tries;

  return (
    <div className="space-y-3">
      {top3.length > 0 && (
        <div className="card pt-4 pb-3">
          <div className="podium-3d">
            {ordre.map((i) => {
              const l = top3[i];
              const moi = l.userId === meId;
              return (
                <Link key={l.userId} href={`/groupes/${groupId}/joueurs/${l.userId}`}
                  aria-current={moi ? "true" : undefined}
                  className="podium-3d-step group focus-visible:outline-accent">
                  <div className={`rounded-full p-0.5 transition-transform group-hover:-translate-y-0.5 ${moi ? "ring-2 ring-accent" : ""}`}>
                    <Avatar id={l.userId} pseudo={l.pseudo} v={avatars.get(l.userId)} size={i === 0 ? 44 : 36} />
                  </div>
                  <span className="w-full truncate text-center text-sm font-bold group-hover:text-accent-fort">
                    {l.pseudo}{moi && <span className="ml-1 text-[11px] text-accent-fort">moi</span>}
                  </span>
                  {l.badge && <span className="flex flex-wrap items-center justify-center gap-1 text-xs">{l.badge}</span>}
                  <div className={`podium-3d-block mt-1 ${MARCHES[i].h}`}>
                    <div className={`podium-3d-cap ${MARCHES[i].c}`} aria-hidden />
                    <div className={`podium-3d-face font-titre ${MARCHES[i].c}`}>{l.rang}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      {reste.length > 0 && (
        <ol className="liste">
          {reste.map((l) => {
            const moi = l.userId === meId;
            return (
              <li key={l.userId}>
                <Link href={`/groupes/${groupId}/joueurs/${l.userId}`} aria-current={moi ? "true" : undefined}
                  className={`ligne group transition-colors hover:bg-surface-2 ${moi ? "bg-accent/8 shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`}>
                  <RankBadge rang={l.rang} />
                  <Avatar id={l.userId} pseudo={l.pseudo} v={avatars.get(l.userId)} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{l.pseudo}{moi && <span className="ml-1.5 text-xs text-accent">moi</span>}</span>
                    {l.detail && <span className="num block text-xs text-texte-3">{l.detail}</span>}
                  </span>
                  {l.badge && <span className="flex shrink-0 items-center gap-1.5">{l.badge}</span>}
                  <Icon name="chevronRight" size={16} className="text-texte-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
