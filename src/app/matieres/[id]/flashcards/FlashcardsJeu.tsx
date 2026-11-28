"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FLASHCARDS } from "@/config/constants";
import { acquises, classer, nouvelleSession, paquet, repondre, type Boites, type Flashcard, type Session } from "@/lib/flashcards";
import Tex from "@/components/Tex";
import Icon from "@/components/Icon";
import RecompenseSolo from "@/components/RecompenseSolo";

/** Flashcards d'une matière : file de cartes, boîtes de Leitner gardées dans le navigateur (aucun classement). */
export default function FlashcardsJeu({ subjectId, source }: { subjectId: string; source: Flashcard[] }) {
  const cle = `flashcards:${subjectId}`;
  const [boites, setBoites] = useState<Boites>({});
  const [session, setSession] = useState<Session | null>(null);
  const [total, setTotal] = useState(0);
  const [tour, setTour] = useState(0); // change à chaque carte : la carte suivante arrive face question, sans animation de retour
  const [retournee, setRetournee] = useState(false);
  const [message, setMessage] = useState("");
  const parId = new Map(source.map((c) => [c.id, c]));

  const demarrer = useCallback((ids: string[]) => {
    setSession(nouvelleSession(ids)); setTotal(ids.length); setRetournee(false); setTour((t) => t + 1);
  }, []);

  // le paquet se tire après le chargement (boîtes du navigateur + hasard) : rien de différent entre serveur et client
  useEffect(() => {
    let b: Boites = {};
    try { b = JSON.parse(localStorage.getItem(cle) ?? "{}") ?? {}; } catch { /* stockage indisponible */ }
    setBoites(b);
    demarrer(paquet(source, b, FLASHCARDS.PAQUET, Math.random).map((c) => c.id));
  }, [cle, source, demarrer]);

  const carte = session?.file[0] ? parId.get(session.file[0]) : undefined;

  const retourner = useCallback(() => {
    if (!carte || retournee) return;
    setRetournee(true);
    setMessage(`Réponse : ${carte.verso}`);
  }, [carte, retournee]);

  const noter = useCallback((savais: boolean) => {
    if (!carte || !session || !retournee) return;
    const b = classer(boites, carte.id, savais);
    setBoites(b);
    try { localStorage.setItem(cle, JSON.stringify(b)); } catch { /* stockage indisponible */ }
    const s = repondre(session, savais);
    setSession(s); setRetournee(false); setTour((t) => t + 1);
    setMessage(s.file.length === 0 ? "Session terminée." : savais ? "Carte suivante." : "Elle reviendra un peu plus tard.");
  }, [boites, carte, cle, retournee, session]);

  // clavier : espace ou entrée retourne, ← à revoir, → je savais
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, a")) return;
      if ((e.key === " " || e.key === "Enter") && !retournee) { e.preventDefault(); retourner(); }
      else if (e.key === "ArrowLeft" && retournee) noter(false);
      else if (e.key === "ArrowRight" && retournee) noter(true);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [noter, retourner, retournee]);

  if (!session) return <div aria-hidden className="card h-72 animate-pulse sm:h-80" />;

  const faites = session.sues.length;
  const acq = acquises(source, boites);

  if (!carte) {
    const premierCoup = session.sues.filter((id) => !session.ratees.includes(id)).length;
    const ratees = session.ratees.map((id) => parId.get(id)).filter((c): c is Flashcard => !!c);
    return (
      <div className="space-y-6">
        <section className="hero pop space-y-4">
          <p className="eyebrow">Session terminée</p>
          <p className="font-titre text-3xl font-extrabold lg:text-4xl"><span className="num">{premierCoup}</span> sur <span className="num">{total}</span> du premier coup</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="chip border-transparent bg-surface text-texte"><Icon name="check" size={14} className="text-ok" /><span className="num">{acq}/{source.length}</span> cartes acquises</span>
            <RecompenseSolo type="flashcards" subjectId={subjectId} />
            {ratees.length > 0 && <span className="chip border-transparent bg-surface text-texte"><Icon name="rotate" size={14} /><span className="num">{ratees.length}</span> revue{ratees.length > 1 ? "s" : ""} plusieurs fois</span>}
          </div>
          <p className="text-[15px] opacity-90">Une carte est acquise quand tu l&apos;as sue trois fois de suite. Les autres repassent en priorité à la prochaine session.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => demarrer(paquet(source, boites, FLASHCARDS.PAQUET, Math.random).map((c) => c.id))} className="btn-hero w-auto">
              <Icon name="play" size={16} />Nouvelle session
            </button>
            {ratees.length > 0 && (
              <button onClick={() => demarrer(ratees.map((c) => c.id))} className="btn-hero w-auto">
                <Icon name="rotate" size={16} />Revoir mes erreurs
              </button>
            )}
          </div>
        </section>
        {ratees.length > 0 && (
          <section className="space-y-3" aria-labelledby="t-recap">
            <h2 id="t-recap" className="h2">À retenir</h2>
            <ul className="liste">
              {ratees.map((c) => (
                <li key={c.id} className="ligne block space-y-1 py-3">
                  <p className="font-medium"><Tex>{c.recto}</Tex></p>
                  <p className="flex items-start gap-1.5 font-semibold text-ok"><Icon name="arrowRight" size={15} className="mt-1 shrink-0" /><Tex>{c.verso}</Tex></p>
                  {c.explication && <p className="text-sm text-texte-2"><Tex>{c.explication}</Tex></p>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <Link href={`/matieres/${subjectId}`} className="btn-white">Retour à la matière</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="chip"><Icon name="check" size={14} className="text-ok" /><span className="num">{faites}/{total}</span> sues</span>
          {session.ratees.length > 0 && <span className="chip"><Icon name="rotate" size={14} className="text-energie" /><span className="num">{session.file.filter((id) => session.ratees.includes(id)).length}</span> à revoir</span>}
          <span className="ml-auto text-texte-3"><span className="num">{acq}/{source.length}</span> acquises</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ligne" aria-hidden>
          <div className="h-full rounded-full bg-ok transition-[width] duration-300" style={{ width: `${(100 * faites) / Math.max(1, total)}%` }} />
        </div>
      </div>

      <div key={tour} className="mem-carte pop h-72 sm:h-80" data-up={retournee}>
        <button type="button" onClick={retourner} disabled={retournee}
          aria-label={retournee ? `${carte.type === "notion" ? "Définition" : "Réponse"} : ${carte.verso}` : `${carte.type === "notion" ? "Notion" : "Question"} : ${carte.recto}. Retourner la carte`}
          className="mem-in block rounded-[18px] text-left">
          <span className="mem-face flex flex-col gap-3 rounded-[18px] border-accent bg-surface p-5 shadow-[inset_0_-5px_0_var(--color-accent-doux)]">
            <span className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-accent-fort uppercase">
                <span aria-hidden className="h-2 w-2 rounded-[2px] bg-accent" />{carte.type === "notion" ? "Notion du cours" : carte.vf ? "Vrai ou faux ?" : "Question"}
              </span>
              <Icon name="cards" size={18} className="text-texte-3" />
            </span>
            <span className="flex flex-1 items-center overflow-y-auto text-lg leading-snug font-semibold sm:text-xl"><Tex>{carte.recto}</Tex></span>
            <span className="inline-flex items-center gap-1.5 self-center text-sm font-semibold text-texte-3"><Icon name="rotate" size={15} />Touche pour voir la réponse</span>
          </span>
          {retournee && (
            <span className="mem-face mem-avant flex flex-col gap-2 overflow-y-auto rounded-[18px] border-energie bg-surface p-5 shadow-[inset_0_-5px_0_var(--color-energie-doux)]">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-energie uppercase">
                <span aria-hidden className="h-2 w-2 rounded-full bg-energie" />{carte.type === "notion" ? "Définition" : "Réponse"}
              </span>
              <span className="text-xl leading-snug font-extrabold sm:text-2xl"><Tex>{carte.verso}</Tex></span>
              {carte.explication && <span className="border-t-2 border-ligne pt-2 text-[15px] leading-relaxed text-texte-2"><Tex>{carte.explication}</Tex></span>}
              <span className="mt-auto border-t-2 border-dashed border-ligne pt-2 text-xs text-texte-3">{carte.recto.length > 90 ? `${carte.recto.slice(0, 90)}…` : carte.recto}</span>
            </span>
          )}
        </button>
      </div>

      {retournee ? (
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => noter(false)} className="btn border-2 border-ko bg-ko-doux text-ko shadow-[0_3px_0_var(--color-ko)]">
            <Icon name="rotate" size={18} />À revoir
          </button>
          <button onClick={() => noter(true)} className="btn bg-ok text-sur-ok shadow-[0_4px_0_color-mix(in_oklab,var(--color-ok)_60%,black)]">
            <Icon name="check" size={18} />Je savais
          </button>
        </div>
      ) : (
        <button onClick={retourner} className="btn-primary"><Icon name="rotate" size={18} />Retourner la carte</button>
      )}
      <p className="text-center text-xs text-texte-3 max-sm:hidden">Clavier : espace pour retourner, ← à revoir, → je savais</p>
      <p className="sr-only" aria-live="polite">{message}</p>
    </div>
  );
}
