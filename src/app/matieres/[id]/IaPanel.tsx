"use client";
import { useActionState } from "react";
import { genererIA, type IaState } from "./actions";
import type { EtatIA } from "@/lib/quiz/ai";
import Icon from "@/components/Icon";

/**
 * Bouton « Générer avec l'IA » : lance l'écriture des 3 prochains quiz en arrière-plan.
 * `etat` (lu sur le serveur, mis à jour par l'actualisation automatique de la page) donne l'avancement et le compte rendu.
 */
export default function IaPanel({ subjectId, etat, secondes }: { subjectId: string; etat: EtatIA | null; secondes: number }) {
  const [state, action, pending] = useActionState<IaState, FormData>(genererIA, null);
  const enCours = pending || !!etat?.enCours;
  return (
    <form action={action} className="card space-y-3" aria-busy={enCours}>
      <input type="hidden" name="subject" value={subjectId} />
      <h2 className="h2 flex items-center gap-2"><Icon name="sparkles" className="text-accent" />Questions par l&apos;IA</h2>
      <p className="text-sm text-texte-2">L&apos;IA écrit les quiz des 3 prochains jours à partir des slides, puis vérifie chaque réponse. Comptez 1 à 2 minutes : vous pouvez quitter la page, ça continue.</p>
      <label className="flex min-h-11 items-center gap-3 text-sm text-texte-2">
        <input type="checkbox" name="regenerer" value="1" className="h-5 w-5 accent-[var(--color-accent)]" />
        Refaire aussi les quiz déjà prêts (si personne ne les a commencés)
      </label>
      <button disabled={enCours} className="btn-primary">
        {enCours
          ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-sur-accent/30 border-t-sur-accent" aria-hidden />L&apos;IA écrit les questions…{secondes ? <span className="num"> ({secondes} s)</span> : null}</>
          : <><Icon name="sparkles" size={18} />Générer avec l&apos;IA</>}
      </button>
      {state?.erreur && <p className="rounded-xl border border-ko/30 bg-ko-doux p-3 text-sm text-ko" role="alert">{state.erreur}</p>}
      {!etat?.enCours && etat?.erreur && <p className="rounded-xl border border-ko/30 bg-ko-doux p-3 text-sm text-ko" role="alert">{etat.erreur}</p>}
      {!etat?.enCours && etat?.resultats && (
        <ul className="space-y-2" role="status">
          {etat.resultats.map((r, i) => (
            <li key={r.date + i} className={`flex gap-2.5 rounded-xl border p-3 text-sm ${r.erreur ? "border-ko/30 bg-ko-doux" : "border-ok/30 bg-ok-doux"}`}>
              <Icon name={r.erreur ? "x" : "check"} size={18} className={r.erreur ? "text-ko" : "text-ok"} />
              <div>
                <p className="font-semibold">Quiz du {r.date}</p>
                {r.erreur ? <p className="text-texte-2">{r.erreur}</p> : (
                  <p className="text-texte-2">{r.report!.chat} question(s) de l&apos;IA{r.report!.simulees ? ` + ${r.report!.simulees} simulée(s) pour compléter` : ""}
                    {r.report!.rejets.length ? ` · ${r.report!.rejets.length} écartée(s)` : ""}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
