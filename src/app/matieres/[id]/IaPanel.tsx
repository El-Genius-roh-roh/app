"use client";
import { useActionState } from "react";
import { genererIA, type IaState } from "./actions";
import type { EtatIA } from "@/lib/quiz/ai";

/**
 * Bouton « Générer avec l'IA » : lance l'écriture des 3 prochains quiz en arrière-plan.
 * `etat` (lu sur le serveur, mis à jour par l'actualisation automatique de la page) donne l'avancement et le compte rendu.
 */
export default function IaPanel({ subjectId, etat, secondes }: { subjectId: string; etat: EtatIA | null; secondes: number }) {
  const [state, action, pending] = useActionState<IaState, FormData>(genererIA, null);
  const enCours = pending || !!etat?.enCours;
  return (
    <form action={action} className="card space-y-3">
      <input type="hidden" name="subject" value={subjectId} />
      <h2 className="h2">Questions par l&apos;IA</h2>
      <p className="muted">L&apos;IA écrit les quiz des 3 prochains jours à partir des slides, puis vérifie chaque réponse. Comptez 1 à 2 minutes : vous pouvez quitter la page, ça continue.</p>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="regenerer" value="1" className="h-4 w-4 accent-accent-600" />
        Refaire aussi les quiz déjà prêts (si personne ne les a commencés)
      </label>
      <button disabled={enCours} className="btn-primary">
        {enCours ? `L'IA écrit les questions…${secondes ? ` (${secondes} s)` : ""}` : "Générer avec l'IA"}
      </button>
      {state?.erreur && <p className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-600">{state.erreur}</p>}
      {!etat?.enCours && etat?.erreur && <p className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-600">{etat.erreur}</p>}
      {!etat?.enCours && etat?.resultats && (
        <ul className="space-y-2">
          {etat.resultats.map((r, i) => (
            <li key={r.date + i} className={`rounded-2xl p-3 text-sm ${r.erreur ? "bg-rose-50" : "bg-emerald-50"}`}>
              <p className="font-semibold"><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${r.erreur ? "bg-rose-500" : "bg-emerald-500"}`} />Quiz du {r.date}</p>
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
