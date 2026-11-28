"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RELIER } from "@/config/constants";
import { donne, relies, type Case, type Donne } from "@/lib/relier";
import type { Paire } from "@/lib/memory";
import Tex from "@/components/Tex";
import Icon from "@/components/Icon";
import RecompenseSolo from "@/components/RecompenseSolo";

type Cote = "terme" | "definition";
const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/**
 * Relier (D40) : on touche un terme puis une définition (ou l'inverse). Une bonne paire se verrouille en vert avec un
 * numéro commun aux deux cases ; une mauvaise clignote en rouge et compte une erreur.
 */
export default function RelierJeu({ subjectId, source, initial, notions }: { subjectId: string; source: Paire[]; initial: Donne; notions: boolean }) {
  const L = notions ? { terme: "Notion", definition: "Définition" } : { terme: "Question", definition: "Réponse" };
  const [jeu, setJeu] = useState(initial);
  const [choix, setChoix] = useState<{ cote: Cote; id: string } | null>(null);
  const [reliees, setReliees] = useState<string[]>([]); // ids dans l'ordre où ils ont été reliés (numéro = rang + 1)
  const [rate, setRate] = useState<{ terme: string; definition: string } | null>(null);
  const [erreurs, setErreurs] = useState(0);
  const [debut, setDebut] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const [maintenant, setMaintenant] = useState(0);
  const [message, setMessage] = useState("");
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const n = jeu.termes.length;

  useEffect(() => {
    if (debut === null || fin !== null) return;
    const t = setInterval(() => setMaintenant(Date.now()), 500);
    return () => clearInterval(t);
  }, [debut, fin]);
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current); }, []);

  function toucher(cote: Cote, c: Case) {
    if (fin !== null || reliees.includes(c.id)) return;
    if (debut === null) { setDebut(Date.now()); setMaintenant(Date.now()); }
    if (rate) { if (minuteur.current) clearTimeout(minuteur.current); setRate(null); }
    // même colonne : on change de sélection (ou on la retire)
    if (!choix || choix.cote === cote) {
      const garde = choix?.cote === cote && choix.id === c.id ? null : { cote, id: c.id };
      setChoix(garde);
      setMessage(garde ? `${L[cote]} choisie. Touche maintenant ${cote === "terme" ? "sa définition" : "sa notion"}.` : "Sélection retirée.");
      return;
    }
    const terme = cote === "terme" ? c.id : choix.id;
    const definition = cote === "definition" ? c.id : choix.id;
    setChoix(null);
    if (relies(terme, definition)) {
      const r = [...reliees, terme];
      setReliees(r);
      if (r.length === n) { setFin(Date.now()); setMessage(`Tout est relié, avec ${erreurs} erreur${erreurs > 1 ? "s" : ""}.`); }
      else setMessage(`Bonne paire ! ${r.length} sur ${n}.`);
    } else {
      setErreurs((e) => e + 1);
      setRate({ terme, definition });
      setMessage("Ces deux-là ne vont pas ensemble.");
      minuteur.current = setTimeout(() => setRate(null), RELIER.DELAI_ERREUR_MS);
    }
  }

  function rejouer() {
    if (minuteur.current) clearTimeout(minuteur.current);
    setJeu(donne(source, RELIER.PAIRES, Math.random));
    setChoix(null); setReliees([]); setRate(null); setErreurs(0); setDebut(null); setFin(null); setMaintenant(0); setMessage("Nouvelle partie.");
  }

  const ecoule = debut === null ? 0 : (fin ?? maintenant) - debut;

  if (fin !== null) {
    const recap = jeu.termes.map((t) => ({ terme: t.texte, definition: jeu.definitions.find((d) => d.id === t.id)!.texte, id: t.id }));
    return (
      <div className="space-y-6">
        <section className="hero pop space-y-4">
          <p className="eyebrow">Partie terminée</p>
          <p className="font-titre text-3xl font-extrabold lg:text-4xl">
            {erreurs === 0 ? "Sans faute !" : <><span className="num">{erreurs}</span> erreur{erreurs > 1 ? "s" : ""}</>}
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="chip border-transparent bg-surface text-texte"><Icon name="check" size={14} className="text-ok" /><span className="num">{n}</span> paires reliées</span>
            <span className="chip border-transparent bg-surface text-texte"><Icon name="clock" size={14} /><span className="num">{fmt(ecoule)}</span></span>
            <RecompenseSolo type="relier" subjectId={subjectId} />
          </div>
          <button onClick={rejouer} className="btn-hero w-auto"><Icon name="play" size={16} />Rejouer</button>
        </section>
        <section className="space-y-3" aria-labelledby="t-recap">
          <h2 id="t-recap" className="h2">À retenir</h2>
          <ul className="liste">
            {recap.map((p) => (
              <li key={p.id} className="ligne block space-y-1 py-3">
                <p className="font-bold"><Tex>{p.terme}</Tex></p>
                <p className="flex items-start gap-1.5 text-texte-2"><Icon name="arrowRight" size={15} className="mt-1 shrink-0 text-ok" /><Tex>{p.definition}</Tex></p>
              </li>
            ))}
          </ul>
        </section>
        <Link href={`/matieres/${subjectId}`} className="btn-white">Retour à la matière</Link>
      </div>
    );
  }

  const bouton = (cote: Cote, c: Case) => {
    const k = reliees.indexOf(c.id);
    const ok = k >= 0;
    const choisi = choix?.cote === cote && choix.id === c.id;
    const ko = rate?.[cote] === c.id;
    const etat = ok ? "border-ok bg-ok-doux text-texte" : ko ? "border-ko bg-ko-doux text-texte" : choisi
      ? (cote === "terme" ? "border-accent bg-accent-doux text-texte -translate-y-0.5" : "border-energie bg-energie-doux text-texte -translate-y-0.5")
      : "border-ligne bg-surface text-texte hover:border-ligne-forte";
    return (
      <li key={c.id}>
        <button type="button" onClick={() => toucher(cote, c)} disabled={ok} aria-pressed={choisi}
          aria-label={`${L[cote]} : ${c.texte}${ok ? ` (reliée, paire ${k + 1})` : ""}`}
          className={`flex min-h-14 w-full items-start gap-2 rounded-[14px] border-2 px-3 py-2.5 text-left shadow-[0_3px_0_var(--color-ligne)] transition-[transform,border-color,background-color] duration-150 active:translate-y-[3px] active:shadow-none disabled:shadow-none ${etat} ${ko ? "mem-non" : ""}`}>
          {ok && <span aria-hidden className="num mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok text-[11px] font-bold text-sur-ok">{k + 1}</span>}
          <span className={`min-w-0 flex-1 leading-snug ${cote === "terme" ? "text-[14px] font-bold" : "text-[13.5px]"}`}><Tex>{c.texte}</Tex></span>
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-3 lg:max-w-4xl">
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="chip"><Icon name="check" size={14} className="text-ok" /><span className="num">{reliees.length}/{n}</span> reliées</span>
        <span className="chip"><Icon name="x" size={14} className="text-ko" /><span className="num">{erreurs}</span> erreur{erreurs > 1 ? "s" : ""}</span>
        <span className="chip"><Icon name="clock" size={14} /><span className="num">{fmt(ecoule)}</span></span>
        {debut !== null && <button onClick={rejouer} className="lien ml-auto text-sm">Recommencer</button>}
      </div>
      <div className="grid grid-cols-[2fr_3fr] gap-2.5 sm:gap-4">
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-accent-fort"><span aria-hidden className="h-2 w-2 rounded-[2px] bg-accent" />{L.terme}s</p>
          <ul className="space-y-2" aria-label={`${L.terme}s`}>{jeu.termes.map((c) => bouton("terme", c))}</ul>
        </div>
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-energie"><span aria-hidden className="h-2 w-2 rounded-full bg-energie" />{L.definition}s</p>
          <ul className="space-y-2" aria-label={`${L.definition}s`}>{jeu.definitions.map((c) => bouton("definition", c))}</ul>
        </div>
      </div>
      <p className="text-sm text-texte-3">{debut === null ? "Le chrono démarre à la première case touchée." : "Touche une case de chaque colonne pour les relier."}</p>
      <p className="sr-only" aria-live="polite">{message}</p>
    </div>
  );
}
