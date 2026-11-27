"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { envoyerPhoto, retirerPhoto, type PhotoState } from "./actions";

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
          {apercu ? <img src={apercu} alt="Aperçu" className="h-28 w-28 rounded-full object-cover ring-4 ring-white/80 shadow-lg" /> : avatar}
          <span className="absolute right-0 bottom-0 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow">📷</span>
        </button>
        <input ref={input} type="file" name="photo" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; setApercu(f ? URL.createObjectURL(f) : null); }} />
        {apercu && <button disabled={pending} className="btn-primary py-2">{pending ? "Envoi…" : "Utiliser cette photo"}</button>}
      </form>
      {!apercu && <p className="muted">Touche la photo pour la changer.</p>}
      {state?.erreur && <p className="text-sm font-bold text-rose-600">{state.erreur}</p>}
      {state?.ok && !apercu && <p className="text-sm font-bold text-emerald-600">✓ Photo mise à jour</p>}
      {aPhoto && !apercu && <form action={retirerPhoto}><button className="text-sm text-rose-500">Retirer la photo</button></form>}
    </div>
  );
}
