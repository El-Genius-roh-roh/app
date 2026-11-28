import type { CorrectionItem } from "@/lib/quiz/service";
import { url } from "@/lib/url";
import Tex from "./Tex";
import Icon from "./Icon";

export default function Correction({ items }: { items: CorrectionItem[] }) {
  return (
    <section className="space-y-3" aria-labelledby="t-corr">
      <h2 id="t-corr" className="eyebrow">Correction</h2>
      <ol className="space-y-2.5">
        {items.map((it, i) => {
          const etat = it.correct === true ? "ok" : it.correct === false ? "ko" : "neutre";
          return (
            <li key={it.id} className={`card space-y-2.5 ${etat === "ok" ? "border-ok/30" : etat === "ko" ? "border-ko/30" : ""}`}>
              <div className="flex gap-3">
                <span className={`num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold
                  ${etat === "ok" ? "bg-ok/15 text-ok" : etat === "ko" ? "bg-ko/15 text-ko" : "bg-surface-2 text-texte-3"}`}
                  aria-label={etat === "ok" ? `Question ${i + 1}, juste` : etat === "ko" ? `Question ${i + 1}, faux` : `Question ${i + 1}`}>
                  {i + 1}
                </span>
                <p className="min-w-0 font-medium break-words"><Tex>{it.enonce}</Tex></p>
              </div>
              <div className="space-y-1.5 pl-10">
                {it.chosen !== null && !it.correct && (it.chosen >= 0 && it.choix[it.chosen] !== undefined
                  ? <p className="flex items-start gap-2 text-sm text-ko"><Icon name="x" size={16} className="mt-0.5" /><span className="line-through decoration-ko/60"><Tex>{it.choix[it.chosen]}</Tex></span></p>
                  // défi Relier ou Vrai ou faux (D41) : la réponse donnée n'est pas un des choix de la question
                  : <p className="flex items-start gap-2 text-sm text-ko"><Icon name="x" size={16} className="mt-0.5" />Mauvaise réponse</p>)}
                <p className="flex items-start gap-2 font-medium text-ok"><Icon name="check" size={16} className="mt-0.5" /><Tex>{it.choix[it.correct_index]}</Tex></p>
                {it.explication && <p className="text-sm text-texte-2"><Tex>{it.explication}</Tex></p>}
                {it.source?.document_id && (
                  <a className="lien inline-flex min-h-9 items-center gap-1 text-sm" target="_blank"
                    href={url(`/api/documents/${it.source.document_id}/file#page=${it.source.pages[0]}`)}>
                    Voir la slide {it.source.pages.join(", ")}<Icon name="arrowRight" size={14} />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
