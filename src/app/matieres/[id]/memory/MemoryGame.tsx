"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MEMORY } from "@/config/constants";
import { distribuer, meilleur, vontEnsemble, type Carte, type Paire, type Score } from "@/lib/memory";
import Tex from "@/components/Tex";
import Icon from "@/components/Icon";
import Details from "@/components/Details";

const LIBELLE = { notion: "Question", definition: "Réponse" } as const;
const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/** Repère de type de carte : couleur + forme + texte (jamais la couleur seule). */
function Type({ face, className = "" }: { face: Carte["face"]; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold tracking-wide uppercase ${face === "notion" ? "text-accent-fort" : "text-energie"} ${className}`}>
      <span aria-hidden className={`h-2 w-2 ${face === "notion" ? "rounded-[2px] bg-accent" : "rounded-full bg-energie"}`} />
      {LIBELLE[face]}
    </span>
  );
}

export default function MemoryGame({ subjectId, source, initial, n }: { subjectId: string; source: Paire[]; initial: Carte[]; n: number }) {
  const [deck, setDeck] = useState(initial);
  const [ouvertes, setOuvertes] = useState<number[]>([]); // indices retournés (0, 1 ou 2)
  const [trouvees, setTrouvees] = useState<Set<string>>(new Set());
  const [rate, setRate] = useState(false); // les 2 cartes ouvertes ne vont pas ensemble
  const [coups, setCoups] = useState(0);
  const [debut, setDebut] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const [maintenant, setMaintenant] = useState(0);
  const [message, setMessage] = useState("");
  const [record, setRecord] = useState<Score | null>(null);
  const [nouveauRecord, setNouveauRecord] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleRecord = `memory-record:${subjectId}`;

  useEffect(() => {
    try { const r = localStorage.getItem(cleRecord); if (r) setRecord(JSON.parse(r)); } catch { /* stockage indisponible */ }
  }, [cleRecord]);
  useEffect(() => {
    if (debut === null || fin !== null) return;
    const t = setInterval(() => setMaintenant(Date.now()), 500);
    return () => clearInterval(t);
  }, [debut, fin]);
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current); }, []);

  const refermer = () => { if (minuteur.current) clearTimeout(minuteur.current); minuteur.current = null; setOuvertes([]); setRate(false); };

  function retourner(i: number) {
    if (fin !== null || trouvees.has(deck[i].paire)) return;
    let ouv = ouvertes;
    if (ouv.length === 2) { refermer(); ouv = []; } // clic pendant l'affichage d'une erreur : on referme et on continue
    if (ouv.includes(i)) return;
    if (debut === null) { setDebut(Date.now()); setMaintenant(Date.now()); }
    const suivantes = [...ouv, i];
    setOuvertes(suivantes);
    if (suivantes.length < 2) { setMessage(`${LIBELLE[deck[i].face]} retournée. Choisis une deuxième carte.`); return; }

    const [a, b] = suivantes.map((k) => deck[k]);
    const total = coups + 1;
    setCoups(total);
    if (vontEnsemble(a, b)) {
      const t = new Set(trouvees).add(a.paire);
      setTrouvees(t);
      setOuvertes([]);
      if (t.size === n) {
        const ms = Date.now() - (debut ?? Date.now());
        setFin(Date.now());
        const score = { coups: total, ms };
        const m = meilleur(record, score);
        setNouveauRecord(m === score);
        setRecord(m);
        try { localStorage.setItem(cleRecord, JSON.stringify(m)); } catch { /* stockage indisponible */ }
        setMessage(`Toutes les paires sont trouvées en ${total} coups.`);
      } else setMessage(`Paire trouvée ! ${t.size} sur ${n}.`);
    } else {
      setRate(true);
      setMessage(a.face === b.face ? `Deux cartes ${LIBELLE[a.face].toLowerCase()} : il faut une question et une réponse.` : "Ces deux cartes ne vont pas ensemble.");
      minuteur.current = setTimeout(refermer, MEMORY.DELAI_ERREUR_MS);
    }
  }

  function rejouer() {
    refermer();
    setDeck(distribuer(source, n, Math.random));
    setTrouvees(new Set()); setCoups(0); setDebut(null); setFin(null); setMaintenant(0); setNouveauRecord(false); setMessage("Nouvelle partie.");
  }

  const ecoule = debut === null ? 0 : (fin ?? maintenant) - debut;
  const lues = ouvertes.map((k) => deck[k]);

  if (fin !== null) {
    const recap = source.filter((p) => trouvees.has(p.id) && deck.some((c) => c.paire === p.id));
    return (
      <div className="space-y-6">
        <section className="hero pop space-y-4">
          <p className="eyebrow">Partie terminée</p>
          <p className="font-titre text-3xl font-extrabold lg:text-4xl">{n} paires en <span className="num">{coups}</span> coups</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="chip border-transparent bg-surface text-texte"><Icon name="clock" size={14} /><span className="num">{fmt(ecoule)}</span></span>
            {nouveauRecord
              ? <span className="chip border-transparent bg-or-vif text-sur-or"><Icon name="trophy" size={14} />Nouveau record</span>
              : record && <span className="chip border-transparent bg-surface text-texte">Record : <span className="num">{record.coups}</span> coups · <span className="num">{fmt(record.ms)}</span></span>}
          </div>
          <Details inverted>Parfait : <span className="num">{n}</span> coups. Chaque coup en plus est une carte que tu as dû chercher.</Details>
          <div className="flex flex-wrap gap-2">
            <button onClick={rejouer} className="btn-hero w-auto"><Icon name="play" size={16} />Rejouer avec d&apos;autres cartes</button>
          </div>
        </section>
        <section className="space-y-3" aria-labelledby="t-recap">
          <h2 id="t-recap" className="h2">À retenir</h2>
          <ul className="liste">
            {recap.map((p) => (
              <li key={p.id} className="ligne block space-y-1 py-3">
                <Type face="notion" />
                <p className="font-medium"><Tex>{p.notion}</Tex></p>
                <p className="flex items-start gap-1.5 font-semibold text-ok"><Icon name="arrowRight" size={15} className="mt-1 shrink-0" /><Tex>{p.definition}</Tex></p>
              </li>
            ))}
          </ul>
        </section>
        <Link href={`/matieres/${subjectId}`} className="btn-white">Retour à la matière</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="chip"><Icon name="check" size={14} className="text-ok" /><span className="num">{trouvees.size}/{n}</span> paires</span>
          <span className="chip"><span className="num">{coups}</span> coup{coups > 1 ? "s" : ""}</span>
          <span className="chip"><Icon name="clock" size={14} /><span className="num">{fmt(ecoule)}</span></span>
          {coups > 0 && <button onClick={rejouer} className="lien ml-auto text-sm">Recommencer</button>}
        </div>

        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3" aria-label="Plateau du Memory">
          {deck.map((c, i) => {
            const ok = trouvees.has(c.paire);
            const up = ok || ouvertes.includes(i);
            const ko = rate && ouvertes.includes(i);
            return (
              <li key={c.cle} className="mem-carte h-32 sm:h-40" data-up={up}>
                <button type="button" onClick={() => retourner(i)} disabled={ok}
                  aria-label={up ? `Carte ${i + 1}, ${LIBELLE[c.face]} : ${c.texte}${ok ? " (paire trouvée)" : ""}` : `Carte ${i + 1}, face cachée`}
                  className={`mem-in block rounded-[14px] text-left ${ko ? "mem-non" : ""} ${up ? "" : "active:translate-y-[3px]"}`}>
                  <span aria-hidden className="mem-face flex items-center justify-center border-accent-ombre bg-accent shadow-[inset_0_-4px_0_var(--color-accent-ombre)]">
                    <span className="grid grid-cols-2 gap-1.5 opacity-90">
                      <span className="h-3 w-3 rounded-[3px] bg-sur-accent/80" /><span className="h-3 w-3 rounded-full bg-or-vif" />
                      <span className="h-3 w-3 rounded-full bg-sur-accent/40" /><span className="h-3 w-3 rounded-[3px] bg-sur-accent/80" />
                    </span>
                  </span>
                  {up && (
                    <span aria-hidden className={`mem-face mem-avant flex flex-col gap-1 p-2 sm:p-2.5 ${
                      ok ? "border-ok bg-ok-doux" : ko ? "border-ko bg-ko-doux" : c.face === "notion" ? "border-accent bg-surface" : "border-energie bg-surface"}`}>
                      <span className="flex items-center justify-between">
                        <Type face={c.face} />
                        {ok && <Icon name="check" size={14} className="text-ok" />}
                      </span>
                      <span className={`line-clamp-5 text-[12.5px] leading-snug sm:text-[13.5px] ${c.face === "definition" ? "font-semibold" : ""}`}><Tex>{c.texte}</Tex></span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* lecture : les cartes ouvertes en grand, le texte complet (les cartes du plateau sont petites sur téléphone) */}
      <aside className="space-y-3 lg:sticky lg:top-20">
        <div className={`card min-h-28 space-y-3 ${rate ? "border-ko" : ""}`}>
          {lues.length === 0 ? (
            <p className="muted text-sm">{coups === 0 ? "Retourne une carte pour commencer. Le chrono démarre au premier clic." : "Retourne deux cartes : une question et sa réponse."}</p>
          ) : lues.map((c) => (
            <div key={c.cle} className="space-y-0.5">
              <Type face={c.face} />
              <p className={c.face === "definition" ? "font-semibold" : "font-medium"}><Tex>{c.texte}</Tex></p>
            </div>
          ))}
          {rate && <p className="flex items-center gap-1.5 text-sm font-semibold text-ko"><Icon name="x" size={15} />Pas la bonne paire</p>}
        </div>
        <p className="sr-only" aria-live="polite">{message}</p>
        {record && <p className="text-sm text-texte-3">Ton record ici : <span className="num">{record.coups}</span> coups · <span className="num">{fmt(record.ms)}</span></p>}
      </aside>
    </div>
  );
}
