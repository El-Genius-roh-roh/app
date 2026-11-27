"use client";
import { useActionState } from "react";
import { genererIA, type IaState } from "./actions";

/** Bouton « Générer avec l'IA » : écrit les 3 prochains quiz, avec le compte rendu de chaque jour. */
export default function IaPanel({ subjectId }: { subjectId: string }) {
  const [state, action, pending] = useActionState<IaState, FormData>(genererIA, null);
  return (
    <form action={action} className="card space-y-3">
      <input type="hidden" name="subject" value={subjectId} />
      <div className="flex items-center justify-between gap-2">
        <h2 className="h2 text-violet-700">🤖 Questions par l&apos;IA</h2>
      </div>
      <p className="muted">L&apos;IA écrit les quiz des 3 prochains jours à partir des slides, puis vérifie chaque réponse. Environ 20 s par quiz.</p>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <input type="checkbox" name="regenerer" value="1" className="h-4 w-4 accent-fuchsia-600" />
        Refaire aussi les quiz déjà prêts (si personne ne les a commencés)
      </label>
      <button disabled={pending} className="btn-primary">{pending ? "⏳ L'IA écrit les questions…" : "✨ Générer avec l'IA"}</button>
      {state?.erreur && <p className="rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-600">{state.erreur}</p>}
      {state?.resultats && (
        <ul className="space-y-2">
          {state.resultats.map((r, i) => (
            <li key={r.date + i} className={`rounded-2xl p-3 text-sm ${r.erreur ? "bg-rose-50" : "bg-emerald-50"}`}>
              <p className="font-bold">{r.erreur ? "❌" : "✅"} Quiz du {r.date}</p>
              {r.erreur ? <p>{r.erreur}</p> : (
                <p>{r.report!.chat} question(s) de l&apos;IA{r.report!.simulees ? ` + ${r.report!.simulees} simulée(s) pour compléter` : ""}
                  {r.report!.rejets.length ? ` · ${r.report!.rejets.length} écartée(s)` : ""}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
