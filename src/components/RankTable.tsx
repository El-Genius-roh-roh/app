import Link from "next/link";
import { avatarsOf } from "@/lib/avatar";
import Avatar from "./Avatar";

// pastille du podium : or, argent, bronze (teintes douces)
const MEDAL = ["bg-[#f5c451] text-[#5c4300]", "bg-[#c9ced6] text-[#3b4048]", "bg-[#e0a77a] text-[#5a3013]"];

export function RankBadge({ rang }: { rang: number }) {
  return (
    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${rang <= 3 ? MEDAL[rang - 1] : "text-slate-500"}`}>{rang}</span>
  );
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
            className={`group flex items-center gap-2.5 rounded-2xl px-3 py-2 transition duration-200 ease-(--ease-ios) hover:-translate-y-px hover:bg-slate-100 active:scale-[0.985]
              ${l.userId === meId ? "bg-accent-50 ring-1 ring-accent-200" : "bg-slate-50"}`}>
            <RankBadge rang={l.rang} />
            <Avatar id={l.userId} pseudo={l.pseudo} v={avatars.get(l.userId)} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[1.02rem] font-medium text-slate-900">{l.pseudo}{l.userId === meId ? " (moi)" : ""}</span>
              {l.detail && <span className="block text-xs text-slate-500">{l.detail}</span>}
            </span>
            {l.badge && <span className="flex shrink-0 items-center gap-1 font-sans">{l.badge}</span>}
            <span aria-hidden className="chevron">›</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
