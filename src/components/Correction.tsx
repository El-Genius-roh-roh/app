import type { CorrectionItem } from "@/lib/quiz/service";

export default function Correction({ items }: { items: CorrectionItem[] }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={it.id} className={`rounded border-l-4 p-3 text-sm ${it.correct === true ? "border-green-500 bg-green-50" : it.correct === false ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-50"}`}>
          <div className="text-xs text-gray-500">Question {i + 1} · {it.kind === "revision" ? "révision" : "nouvelle"}</div>
          <p className="font-medium">{it.enonce}</p>
          <p className="mt-1">
            {it.chosen === null ? <span className="text-gray-500">Pas de réponse.</span> : <>Ta réponse : <b>{it.choix[it.chosen]}</b> {it.correct ? "✅" : "❌"}</>}
          </p>
          {!it.correct && <p>Bonne réponse : <b className="text-green-700">{it.choix[it.correct_index]}</b></p>}
          <p className="mt-1 text-gray-700">{it.explication}</p>
          <a className="mt-1 inline-block text-xs text-indigo-700 underline" target="_blank"
            href={`/api/documents/${it.source.document_id}/file#page=${it.source.pages[0]}`}>
            Revoir la slide {it.source.pages.join(", ")}
          </a>
        </li>
      ))}
    </ol>
  );
}
