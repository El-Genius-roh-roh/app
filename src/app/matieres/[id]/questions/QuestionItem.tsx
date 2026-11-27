"use client";
import { useState } from "react";
import Tex from "@/components/Tex";
import ConfirmButton from "@/components/ConfirmButton";
import QuestionForm from "./QuestionForm";
import { supprimerQuestion } from "./actions";
import type { EditQuestion } from "@/lib/quiz/manual";

type Doc = { id: string; nom: string; nb_pages: number | null };

export default function QuestionItem({ n, q, subjectId, dayId, docs, locked }: {
  n: number; q: EditQuestion; subjectId: string; dayId: string; docs: Doc[]; locked: boolean;
}) {
  const [edit, setEdit] = useState(false);
  return (
    <li className="card space-y-2">
      <div className="flex items-start gap-2">
        <span className="font-titre text-lg font-bold text-violet-500">{n}.</span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap gap-1">
            <span className="chip bg-violet-100 text-violet-700">{q.type === "qcm" ? "QCM" : "Vrai/Faux"}</span>
            <span className="chip bg-sky-100 text-sky-700">{q.kind === "new" ? "nouvelle" : "révision"}</span>
            {q.manuelle && <span className="chip bg-amber-100 text-amber-700">✍️ manuelle</span>}
          </div>
          {!edit && (
            <>
              <p className="font-semibold break-words"><Tex>{q.enonce}</Tex></p>
              <ul className="space-y-0.5 text-sm">
                {q.choix.map((c, i) => (
                  <li key={i} className={i === q.correct_index ? "font-bold text-emerald-600" : "text-slate-600"}>
                    {i === q.correct_index ? "✓ " : "· "}<Tex>{c}</Tex>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {edit && <QuestionForm subjectId={subjectId} dayId={dayId} docs={docs} question={q} onDone={() => setEdit(false)} />}

      {!locked && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setEdit((e) => !e)} className="btn-ghost py-2 text-sm">{edit ? "Annuler" : "✏️ Modifier"}</button>
          <form action={supprimerQuestion} className="w-full">
            <input type="hidden" name="subject" value={subjectId} />
            <input type="hidden" name="day" value={dayId} />
            <input type="hidden" name="question" value={q.id} />
            <ConfirmButton message="Supprimer cette question ?" className="btn w-full border-2 border-rose-200 bg-white/60 backdrop-blur-md py-2 text-sm text-rose-600">🗑 Supprimer</ConfirmButton>
          </form>
        </div>
      )}
    </li>
  );
}
