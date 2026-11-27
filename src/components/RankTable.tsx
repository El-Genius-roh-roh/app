const MEDAL = ["🥇", "🥈", "🥉"];
const PODIUM = ["bg-gradient-to-r from-amber-300 to-yellow-200", "bg-gradient-to-r from-slate-200 to-slate-100", "bg-gradient-to-r from-orange-300 to-orange-200"];

export function RankBadge({ rang }: { rang: number }) {
  return <span className="inline-flex w-8 justify-center text-lg font-extrabold">{rang <= 3 ? MEDAL[rang - 1] : rang}</span>;
}

export const fmtMs = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s} s`;
};

/** `badge` remplace l'ancien affichage des points (ligue, exploits du jour…). */
type Line = { userId: string; pseudo: string; rang: number; detail?: string; badge?: React.ReactNode };

export default function RankTable({ lines, meId, empty }: { lines: Line[]; meId: string; empty?: string }) {
  if (lines.length === 0) return <p className="muted">{empty ?? "Pas encore de classement."}</p>;
  return (
    <ol className="space-y-2">
      {lines.map((l) => (
        <li key={l.userId}
          className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 ${l.rang <= 3 ? PODIUM[l.rang - 1] : "bg-violet-50"} ${l.userId === meId ? "ring-3 ring-fuchsia-500" : ""}`}>
          <RankBadge rang={l.rang} />
          <span className="flex-1 truncate font-bold">{l.pseudo}</span>
          {l.detail && <span className="text-xs font-semibold text-slate-600">{l.detail}</span>}
          {l.badge && <span className="flex shrink-0 items-center gap-1">{l.badge}</span>}
        </li>
      ))}
    </ol>
  );
}
