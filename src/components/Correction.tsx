import type { CorrectionItem } from "@/lib/quiz/service";
import { url } from "@/lib/url";
import Tex from "./Tex";

export default function Correction({ items }: { items: CorrectionItem[] }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => {
        const tone = it.correct === true ? "border-emerald-400" : it.correct === false ? "border-rose-400" : "border-violet-200";
        return (
          <li key={it.id} className={`card border-l-8 ${tone} space-y-2`}>
            <p className="font-bold"><span className="mr-1 text-violet-500">{i + 1}.</span> <Tex>{it.enonce}</Tex></p>
            {it.chosen !== null && !it.correct && <p className="text-sm text-rose-600 line-through"><Tex>{it.choix[it.chosen]}</Tex></p>}
            <p className="font-bold text-emerald-600">✓ <Tex>{it.choix[it.correct_index]}</Tex></p>
            {it.explication && <p className="text-sm text-slate-600"><Tex>{it.explication}</Tex></p>}
            <a className="text-xs font-bold text-violet-600" target="_blank"
              href={url(`/api/documents/${it.source.document_id}/file#page=${it.source.pages[0]}`)}>
              Voir la slide {it.source.pages.join(", ")} →
            </a>
          </li>
        );
      })}
    </ol>
  );
}
