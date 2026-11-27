"use client";
import { useActionState, useState } from "react";
import { importerChat, type ChatState } from "../actions";
import Icon from "@/components/Icon";

const Etape = ({ n }: { n: number }) => (
  <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-sur-accent" aria-hidden>{n}</span>
);

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
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
      <section className="card space-y-3" aria-labelledby="t-prompt">
        <h2 id="t-prompt" className="h2 flex items-center gap-2.5"><Etape n={1} />Copie le prompt</h2>
        <p className="muted">Quiz du {dates.join(", du ")}</p>
        <label htmlFor="prompt" className="sr-only">Prompt à copier</label>
        <textarea id="prompt" readOnly value={prompt} rows={6} className="input font-num text-xs lg:h-80" />
        <button type="button" onClick={copy} className="btn-primary" aria-live="polite">
          {copied ? <><Icon name="check" size={18} />Copié</> : <><Icon name="copy" size={18} />Copier le prompt</>}
        </button>
      </section>

      <form action={action} className="card space-y-3" aria-labelledby="t-reponse">
        <h2 id="t-reponse" className="h2 flex items-center gap-2.5"><Etape n={2} />Recolle la réponse</h2>
        <p className="muted">Colle le prompt dans Claude, puis colle ici sa réponse complète (JSON).</p>
        <input type="hidden" name="subject" value={subjectId} />
        <label htmlFor="reponse" className="sr-only">Réponse du chat</label>
        <textarea id="reponse" name="reponse" rows={8} required placeholder='{"jours":[...]}' className="input font-num text-xs lg:h-80" />
        <button disabled={pending} className="btn-primary">
          {pending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-sur-accent/30 border-t-sur-accent" aria-hidden />Import…</> : <><Icon name="upload" size={18} />Importer les questions</>}
        </button>
        {state?.erreur && <p className="rounded-[14px] border-2 border-ko/30 bg-ko-doux p-3 text-sm font-semibold text-ko" role="alert">{state.erreur}</p>}
        {state?.resultats && (
          <ul className="space-y-2" role="status">
            {state.resultats.map((r) => (
              <li key={r.date} className={`rounded-[14px] border-2 p-3 text-sm ${r.erreur ? "border-ko/30 bg-ko-doux" : "border-ok/30 bg-ok-doux"}`}>
                <p className={`flex items-center gap-1.5 font-bold ${r.erreur ? "text-ko" : "text-ok"}`}><Icon name={r.erreur ? "x" : "check"} size={16} />Quiz du {r.date}</p>
                {r.erreur ? <p className="mt-1">{r.erreur}</p> : (
                  <p className="mt-1 text-texte-2">{r.report!.chat} question(s) du chat{r.report!.manuelles ? ` + ${r.report!.manuelles} manuelle(s) conservée(s)` : ""}{r.report!.simulees ? ` + ${r.report!.simulees} simulée(s) pour compléter` : ""}</p>
                )}
                {r.report?.rejets.length ? (
                  <details className="mt-1"><summary className="min-h-9 cursor-pointer text-xs font-semibold text-texte-2">{r.report.rejets.length} rejetée(s)</summary>
                    <ul className="mt-1 list-disc pl-4 text-xs text-texte-2">{r.report.rejets.map((x, i) => <li key={i}>{x}</li>)}</ul></details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
}
