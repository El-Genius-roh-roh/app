"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { enregistrerQuestion, type QState } from "./actions";
import type { EditQuestion } from "@/lib/quiz/manual";
import Icon from "@/components/Icon";

type Doc = { id: string; nom: string; nb_pages: number | null };
const LETTRES = ["A", "B", "C", "D"];

export default function QuestionForm({ subjectId, dayId, docs, question, onDone }: {
  subjectId: string; dayId: string; docs: Doc[]; question?: EditQuestion; onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<QState, FormData>(enregistrerQuestion, null);
  const [type, setType] = useState<"qcm" | "vrai_faux">(question?.type ?? "qcm");
  const form = useRef<HTMLFormElement>(null);
  const qcmChoix = question?.type === "qcm" ? question.choix : ["", "", "", ""];

  useEffect(() => {
    if (!state?.ok) return;
    if (!question) form.current?.reset();
    onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.n]);

  const aide = "font-normal text-texte-3";
  return (
    <form ref={form} action={action} className="space-y-4">
      <input type="hidden" name="subject" value={subjectId} />
      <input type="hidden" name="day" value={dayId} />
      {question && <input type="hidden" name="question" value={question.id} />}
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-surface-2 p-1" role="group" aria-label="Type de question">
        {([["qcm", "QCM (4 choix)"], ["vrai_faux", "Vrai / Faux"]] as const).map(([t, label]) => (
          <button key={t} type="button" onClick={() => setType(t)} aria-pressed={type === t}
            className={`min-h-10 rounded-[10px] px-3 text-sm font-bold transition-colors ${type === t ? "bg-surface text-accent-fort shadow-[0_2px_0_var(--color-ligne)]" : "text-texte-2 hover:text-texte"}`}>{label}</button>
        ))}
      </div>

      <label className="block text-sm font-bold">Énoncé
        <textarea name="enonce" required rows={2} defaultValue={question?.enonce} className="input mt-1.5 font-normal" placeholder="Ex. Quelle est la loi de $X$ si…" />
      </label>

      {type === "qcm" ? (
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-bold">Choix <span className={aide}>(coche la bonne réponse)</span></legend>
          {LETTRES.map((l, i) => (
            <div key={l} className="flex items-center gap-2.5">
              <input type="radio" id={`bonne-${dayId}-${question?.id ?? "n"}-${i}`} name="bonne" value={i} required
                defaultChecked={question?.type === "qcm" ? question.correct_index === i : i === 0} className="h-5 w-5 shrink-0 accent-[var(--color-ok)]"
                aria-label={`Choix ${l} est la bonne réponse`} />
              <span className="num w-4 shrink-0 font-semibold text-texte-3" aria-hidden>{l}</span>
              <input name={`choix${i}`} required defaultValue={qcmChoix[i]} aria-label={`Choix ${l}`} className="input min-h-11 py-2" />
            </div>
          ))}
        </fieldset>
      ) : (
        <fieldset>
          <legend className="mb-1.5 text-sm font-bold">Bonne réponse</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {["Vrai", "Faux"].map((v, i) => (
              <label key={v} className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border-2 border-ligne px-4 font-bold has-[:checked]:border-ok has-[:checked]:bg-ok-doux has-[:checked]:text-ok">
                <input type="radio" name="bonne_vf" value={i} defaultChecked={question?.type === "vrai_faux" ? question.correct_index === i : i === 0} className="accent-[var(--color-ok)]" /> {v}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="block text-sm font-bold">Explication <span className={aide}>(facultative)</span>
        <textarea name="explication" rows={2} defaultValue={question?.explication} className="input mt-1.5 font-normal" />
      </label>

      {docs.length > 0 && (
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <label className="text-sm font-bold">Slide du cours <span className={aide}>(facultatif)</span>
            <select name="document" defaultValue={question?.source?.document_id ?? ""} className="input mt-1.5 py-2 font-normal">
              <option value="">Aucune</option>
              {docs.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">Page
            <input type="number" name="page" min={1} defaultValue={question?.source?.pages[0] ?? 1} className="input num mt-1.5 py-2 font-normal" />
          </label>
        </div>
      )}

      {state?.erreur && <p className="rounded-[14px] border-2 border-ko/30 bg-ko-doux p-3 text-sm font-semibold text-ko" role="alert">{state.erreur}</p>}
      {state?.ok && !question && <p className="flex items-center gap-1.5 rounded-[14px] border-2 border-ok/30 bg-ok-doux p-3 text-sm font-semibold text-ok" role="status"><Icon name="check" size={16} />Question ajoutée</p>}
      <button disabled={pending} className="btn-primary">
        {pending ? "Enregistrement…" : question ? <><Icon name="check" size={18} />Enregistrer les modifications</> : <><Icon name="plus" size={18} />Ajouter la question</>}
      </button>
    </form>
  );
}
