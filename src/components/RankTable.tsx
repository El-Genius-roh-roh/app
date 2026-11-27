import Link from "next/link";
import { avatarsOf } from "@/lib/avatar";
import Avatar from "./Avatar";

const MEDAL = ["🥇", "🥈", "🥉"];
const PODIUM = ["bg-gradient-to-r from-amber-300 to-yellow-200", "bg-gradient-to-r from-slate-200 to-slate-100", "bg-gradient-to-r from-orange-300 to-orange-200"];

export function RankBadge({ rang }: { rang: number }) {
  return <span className="inline-flex w-8 shrink-0 justify-center font-titre text-lg font-bold">{rang <= 3 ? MEDAL[rang - 1] : rang}</span>;
}

export const fmtMs = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s} s`;
};

/** `badge` remplace l'ancien affichage des points (ligue, exploits du jour…). */
type Line = { userId: string; pseudo: string; rang: number; detail?: string; badge?: React.ReactNode };

/** Classement : un bouton par joueur, dans l'ordre du classement ; il ouvre la fiche du joueur dans le groupe. */
export default async function RankTable({ lines, meId, groupId, empty }: { lines: Line[]; meId: string; groupId: string; empty?: string }) {
  if (lines.length === 0) return <p className="muted">{empty ?? "Pas encore de classement."}</p>;
  const avatars = await avatarsOf(lines.map((l) => l.userId));
  const tries = [...lines].sort((a, b) => a.rang - b.rang);
  return (
    <ol className="space-y-2">
      {tries.map((l) => (
        <li key={l.userId}>
          <Link href={`/groupes/${groupId}/joueurs/${l.userId}`}
            className={`group flex items-center gap-2.5 rounded-2xl px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]
              ${l.rang <= 3 ? PODIUM[l.rang - 1] : "bg-violet-50"} ${l.userId === meId ? "ring-3 ring-fuchsia-500" : ""}`}>
            <RankBadge rang={l.rang} />
            <Avatar id={l.userId} pseudo={l.pseudo} v={avatars.get(l.userId)} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[1.05rem] text-slate-900">{l.pseudo}{l.userId === meId ? " (moi)" : ""}</span>
              {l.detail && <span className="block font-sans text-xs font-semibold text-slate-600">{l.detail}</span>}
            </span>
            {l.badge && <span className="flex shrink-0 items-center gap-1 font-sans">{l.badge}</span>}
            <span aria-hidden className="text-lg text-violet-400 transition group-hover:translate-x-0.5">›</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
