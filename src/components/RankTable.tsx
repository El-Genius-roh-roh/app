import Link from "next/link";
import { avatarsOf } from "@/lib/avatar";
import Avatar from "./Avatar";
import Icon from "./Icon";

/** Rang : 1-2-3 en or / argent / bronze (chiffres de tableau d'affichage), les autres en gris. */
const PODIUM = ["text-or", "text-argent", "text-bronze"];
export function RankBadge({ rang }: { rang: number }) {
  return <span className={`rang ${rang <= 3 ? PODIUM[rang - 1] : ""}`}>{rang}</span>;
}

export const fmtMs = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s} s`;
};

/** `badge` remplace l'ancien affichage des points (ligue, exploits du jour…). */
type Line = { userId: string; pseudo: string; rang: number; detail?: string; badge?: React.ReactNode };

/** Classement : une ligne par joueur, dans l'ordre ; elle ouvre la fiche du joueur dans le groupe. */
export default async function RankTable({ lines, meId, groupId, empty }: { lines: Line[]; meId: string; groupId: string; empty?: string }) {
  if (lines.length === 0) return <p className="muted">{empty ?? "Pas encore de classement."}</p>;
  const avatars = await avatarsOf(lines.map((l) => l.userId));
  const tries = [...lines].sort((a, b) => a.rang - b.rang);
  return (
    <ol className="liste">
      {tries.map((l) => {
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
  );
}
