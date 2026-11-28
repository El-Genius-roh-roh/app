import Link from "next/link";
import { ChevronRight } from "lucide-react";
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

/** Classement : podium visuel optionnel pour le top 3, puis liste cliquable vers la fiche du joueur. */
export default async function RankTable({ lines, meId, groupId, empty, podium = false }: {
  lines: Line[];
  meId: string;
  groupId: string;
  empty?: string;
  podium?: boolean;
}) {
  if (lines.length === 0) return <p className="muted">{empty ?? "Pas encore de classement."}</p>;
  const avatars = await avatarsOf(lines.map((l) => l.userId));
  const tries = [...lines].sort((a, b) => a.rang - b.rang);

  const showPodium = podium && tries.length >= 3;
  const top3 = showPodium ? [tries[1], tries[0], tries[2]] : [];
  const rest = showPodium ? tries.slice(3) : tries;

  return (
    <div className="space-y-3">
      {showPodium && (
        <div className="grid grid-cols-3 items-end gap-2 pt-2">
          {top3.map((l) => {
            const isFirst = l.rang === 1;
            return (
              <Link key={l.userId} href={`/groupes/${groupId}/joueurs/${l.userId}`}
                className={`flex flex-col items-center rounded-2xl p-2.5 text-center transition duration-200 ease-(--ease-ios) hover:-translate-y-0.5 active:scale-[0.98]
                  ${l.userId === meId ? "bg-accent-50 ring-1 ring-accent-200" : "bg-slate-50 hover:bg-slate-100"}
                  ${isFirst ? "pb-4 pt-3 shadow-sm" : ""}`}>
                <RankBadge rang={l.rang} />
                <Avatar id={l.userId} pseudo={l.pseudo} v={avatars.get(l.userId)} size={isFirst ? 52 : 42} className="mt-1.5" />
                <span className="mt-1.5 w-full truncate text-sm font-semibold">{l.pseudo}{l.userId === meId ? " (moi)" : ""}</span>
                {l.badge && <span className="mt-1 flex flex-wrap items-center justify-center gap-1">{l.badge}</span>}
              </Link>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <ol className="space-y-2">
          {rest.map((l) => (
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
                <ChevronRight className="chevron h-5 w-5" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
