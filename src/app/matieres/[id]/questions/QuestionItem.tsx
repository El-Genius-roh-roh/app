"use client";
import { useState } from "react";
import Tex from "@/components/Tex";
import ConfirmButton from "@/components/ConfirmButton";
import Icon from "@/components/Icon";
import QuestionForm from "./QuestionForm";
import { supprimerQuestion } from "./actions";
import type { EditQuestion } from "@/lib/quiz/manual";

type Doc = { id: string; nom: string; nb_pages: number | null };

export default function QuestionItem({ n, q, subjectId, dayId, docs, locked }: {
  n: number; q: EditQuestion; subjectId: string; dayId: string; docs: Doc[]; locked: boolean;
}) {
  const [edit, setEdit] = useState(false);
  return (
    <li className="card space-y-3">
      <div className="flex items-start gap-3">
        <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-sm font-semibold text-texte-2">{n}</span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="chip">{q.type === "qcm" ? "QCM" : "Vrai / Faux"}</span>
            <span className={`chip ${q.kind === "new" ? "border-accent/30 bg-accent-doux text-accent-fort" : ""}`}>{q.kind === "new" ? "Nouvelle" : "Révision"}</span>
            {q.manuelle && <span className="chip border-or/30 bg-or-doux text-or"><Icon name="pencil" size={11} />Manuelle</span>}
          </div>
          {!edit && (
            <>
              <p className="font-semibold break-words"><Tex>{q.enonce}</Tex></p>
              <ul className="space-y-1 text-sm">
                {q.choix.map((c, i) => (
                  <li key={i} className={`flex items-start gap-1.5 ${i === q.correct_index ? "font-semibold text-ok" : "text-texte-2"}`}>
                    {i === q.correct_index ? <Icon name="check" size={15} className="mt-0.5 shrink-0" label="Bonne réponse" /> : <span className="w-[15px] shrink-0 text-center" aria-hidden>·</span>}
                    <Tex>{c}</Tex>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {edit && <QuestionForm subjectId={subjectId} dayId={dayId} docs={docs} question={q} onDone={() => setEdit(false)} />}

      {!locked && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setEdit((e) => !e)} className="btn-white min-h-11 text-sm">
            {edit ? "Annuler" : <><Icon name="pencil" size={15} />Modifier</>}
          </button>
          <form action={supprimerQuestion}>
            <input type="hidden" name="subject" value={subjectId} />
            <input type="hidden" name="day" value={dayId} />
            <input type="hidden" name="question" value={q.id} />
            <ConfirmButton message="Supprimer cette question ? Elle sera retirée du quiz." className="btn-danger min-h-11 text-sm"><Icon name="trash" size={15} />Supprimer</ConfirmButton>
          </form>
        </div>
      )}
    </li>
  );
}
