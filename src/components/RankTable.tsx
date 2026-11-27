const MEDAL = ["🥇", "🥈", "🥉"];

export function RankBadge({ rang }: { rang: number }) {
  return <span className="inline-block w-7 text-center">{rang <= 3 ? MEDAL[rang - 1] : rang}</span>;
}

export const fmtMs = (ms: number) => {
  const s = ms / 1000;
  return s >= 60 ? `${Math.floor(s / 60)} min ${String(Math.floor(s % 60)).padStart(2, "0")} s` : `${s.toFixed(1)} s`;
};

type Line = { userId: string; pseudo: string; rang: number; points: number; detail: string };

export default function RankTable({ lines, meId, empty }: { lines: Line[]; meId: string; empty?: string }) {
  if (lines.length === 0) return <p className="text-sm text-gray-500">{empty ?? "Pas encore de classement."}</p>;
  return (
    <ol className="divide-y rounded border text-sm">
      {lines.map((l) => (
        <li key={l.userId} className={`flex items-center gap-2 p-2 ${l.userId === meId ? "bg-indigo-50 font-semibold" : ""}`}>
          <RankBadge rang={l.rang} />
          <span className="flex-1 truncate">{l.pseudo}{l.userId === meId && " (moi)"}</span>
          <span className="text-xs font-normal text-gray-500">{l.detail}</span>
          <span className="w-16 text-right">{l.points} pts</span>
        </li>
      ))}
    </ol>
  );
}
