"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { envoyerPhoto, retirerPhoto, type PhotoState } from "./actions";
import Icon from "@/components/Icon";

export default function PhotoForm({ avatar, aPhoto }: { avatar: React.ReactNode; aPhoto: boolean }) {
  const [state, action, pending] = useActionState<PhotoState, FormData>(envoyerPhoto, null);
  const [apercu, setApercu] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (state?.ok) setApercu(null); }, [state]);
  useEffect(() => () => { if (apercu) URL.revokeObjectURL(apercu); }, [apercu]);

  return (
    <div className="card flex flex-col items-center gap-3 text-center">
      <form action={action} className="flex flex-col items-center gap-3">
        <button type="button" onClick={() => input.current?.click()} className="group relative rounded-full" aria-label="Changer de photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {apercu ? <img src={apercu} alt="Aperçu de la nouvelle photo" className="h-28 w-28 rounded-full object-cover ring-4 ring-surface" /> : avatar}
          <span className="absolute right-0 bottom-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface bg-accent text-sur-accent shadow-[0_3px_0_var(--color-accent-ombre)] transition-transform group-hover:scale-105">
            <Icon name="upload" size={18} />
          </span>
        </button>
        <input ref={input} type="file" name="photo" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; setApercu(f ? URL.createObjectURL(f) : null); }} />
        {apercu && (
          <div className="flex gap-2">
            <button disabled={pending} className="btn-primary w-auto">{pending ? "Envoi…" : "Utiliser cette photo"}</button>
            <button type="button" onClick={() => { setApercu(null); if (input.current) input.current.value = ""; }} className="btn-white w-auto">Annuler</button>
          </div>
        )}
      </form>
      {!apercu && <p className="muted">Touche la photo pour la changer.</p>}
      {state?.erreur && <p className="text-sm font-semibold text-ko" role="alert">{state.erreur}</p>}
      {state?.ok && !apercu && <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ok" role="status"><Icon name="check" size={16} />Photo mise à jour</p>}
      {aPhoto && !apercu && <form action={retirerPhoto}><button className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ko"><Icon name="trash" size={15} />Retirer la photo</button></form>}
    </div>
  );
}
