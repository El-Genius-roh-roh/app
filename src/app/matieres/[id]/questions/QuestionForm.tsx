"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { enregistrerQuestion, type QState } from "./actions";
import type { EditQuestion } from "@/lib/quiz/manual";

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

  return (
    <form ref={form} action={action} className="space-y-3">
      <input type="hidden" name="subject" value={subjectId} />
      <input type="hidden" name="day" value={dayId} />
      {question && <input type="hidden" name="question" value={question.id} />}
      <input type="hidden" name="type" value={type} />

      <div className="flex rounded-2xl bg-violet-50 p-1">
        {([["qcm", "QCM (4 choix)"], ["vrai_faux", "Vrai / Faux"]] as const).map(([t, label]) => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`flex-1 rounded-xl px-3 py-1.5 text-sm transition ${type === t ? "bg-white text-violet-700 shadow" : "text-slate-500"}`}>{label}</button>
        ))}
      </div>

      <label className="block text-sm font-semibold">Énoncé
        <textarea name="enonce" required rows={2} defaultValue={question?.enonce} className="input mt-1" placeholder="Ex. Quelle est la loi de $X$ si…" />
      </label>

      {type === "qcm" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Choix <span className="font-normal text-slate-500">(coche la bonne réponse)</span></legend>
          {LETTRES.map((l, i) => (
            <label key={l} className="flex items-center gap-2">
              <input type="radio" name="bonne" value={i} required defaultChecked={question?.type === "qcm" ? question.correct_index === i : i === 0} className="h-5 w-5 accent-emerald-500" />
              <span className="w-5 font-bold text-violet-500">{l}</span>
              <input name={`choix${i}`} required defaultValue={qcmChoix[i]} className="input py-2" />
            </label>
          ))}
        </fieldset>
      ) : (
        <fieldset className="flex gap-3">
          <legend className="mb-1 text-sm font-semibold">Bonne réponse</legend>
          {["Vrai", "Faux"].map((v, i) => (
            <label key={v} className="flex flex-1 items-center gap-2 rounded-2xl border-2 border-violet-100 px-4 py-2 font-semibold has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50">
              <input type="radio" name="bonne_vf" value={i} defaultChecked={question?.type === "vrai_faux" ? question.correct_index === i : i === 0} className="accent-emerald-500" /> {v}
            </label>
          ))}
        </fieldset>
      )}

      <label className="block text-sm font-semibold">Explication <span className="font-normal text-slate-500">(facultative)</span>
        <textarea name="explication" rows={2} defaultValue={question?.explication} className="input mt-1" />
      </label>

      {docs.length > 0 && (
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <label className="text-sm font-semibold">Slide du cours <span className="font-normal text-slate-500">(facultatif)</span>
            <select name="document" defaultValue={question?.source?.document_id ?? ""} className="input mt-1 py-2">
              <option value="">Aucune</option>
              {docs.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Page
            <input type="number" name="page" min={1} defaultValue={question?.source?.pages[0] ?? 1} className="input mt-1 py-2" />
          </label>
        </div>
      )}

      {state?.erreur && <p className="rounded-2xl bg-rose-50 p-2 text-sm font-bold text-rose-600">{state.erreur}</p>}
      {state?.ok && !question && <p className="rounded-2xl bg-emerald-50 p-2 text-sm font-bold text-emerald-700">✓ Question ajoutée</p>}
      <button disabled={pending} className="btn-primary">{pending ? "Enregistrement…" : question ? "💾 Enregistrer" : "＋ Ajouter la question"}</button>
    </form>
  );
}
