"use client";
import { useActionState, useState } from "react";
import { importerChat, type ChatState } from "../actions";

export default function ChatPanel({ subjectId, prompt, dates }: { subjectId: string; prompt: string; dates: string[] }) {
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState<ChatState, FormData>(importerChat, null);

  async function copy() {
    try { await navigator.clipboard.writeText(prompt); }
    catch { // contexte non sécurisé : on sélectionne le texte pour un Ctrl+C manuel
      const el = document.getElementById("prompt") as HTMLTextAreaElement | null;
      el?.select(); document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
      <section className="card space-y-3">
        <h2 className="h2 text-accent-700">1 · Le prompt</h2>
        <p className="muted">Quiz du {dates.join(", du ")}</p>
        <textarea id="prompt" readOnly value={prompt} rows={6} className="input font-mono text-xs lg:h-80" />
        <button type="button" onClick={copy} className="btn-primary">{copied ? "✓ Copié !" : "Copier le prompt"}</button>
      </section>

      <form action={action} className="card space-y-3">
        <h2 className="h2 text-orange-600">2 · La réponse du chat</h2>
        <input type="hidden" name="subject" value={subjectId} />
        <textarea name="reponse" rows={8} required placeholder='{"jours":[...]}' className="input font-mono text-xs lg:h-80" />
        <button disabled={pending} className="btn-orange">{pending ? "Import…" : "Importer les questions"}</button>
        {state?.erreur && <p className="rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-600">{state.erreur}</p>}
        {state?.resultats && (
          <ul className="space-y-2">
            {state.resultats.map((r) => (
              <li key={r.date} className={`rounded-2xl p-3 text-sm ${r.erreur ? "bg-rose-50" : "bg-emerald-50"}`}>
                <p className="font-bold"><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${r.erreur ? "bg-rose-500" : "bg-emerald-500"}`} />{r.date}</p>
                {r.erreur ? <p>{r.erreur}</p> : (
                  <p>{r.report!.chat} question(s) du chat{r.report!.manuelles ? ` + ${r.report!.manuelles} manuelle(s) conservée(s)` : ""}{r.report!.simulees ? ` + ${r.report!.simulees} simulée(s) pour compléter` : ""}</p>
                )}
                {r.report?.rejets.length ? (
                  <details className="mt-1"><summary className="cursor-pointer text-xs">{r.report.rejets.length} rejetée(s)</summary>
                    <ul className="mt-1 list-disc pl-4 text-xs">{r.report.rejets.map((x, i) => <li key={i}>{x}</li>)}</ul></details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
}
