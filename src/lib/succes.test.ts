import { describe, expect, it } from "vitest";
import { defisDuJour, succes, titresDuGroupe, type EntreeSucces } from "./succes";
import { vitrine } from "./trophees";

const solo0 = { flashcards: 0, memory: 0, arene: 0 };

describe("défis du jour", () => {
  it("quiz, flashcards, Memory et Arène, cochés selon ce qui a été fait", () => {
    const d = defisDuJour({ quiz: { faits: 1, total: 2, href: "/quiz/x" }, solo: { ...solo0, flashcards: 1 }, multi: 0, matiere: "m" });
    expect(d.map((x) => [x.id, x.fait])).toEqual([["quiz", false], ["flashcards", true], ["memory", false], ["arene", false]]);
    expect(d[1].href).toBe("/matieres/m/flashcards");
  });
  it("pas de quiz aujourd'hui ni de matière jouable : seulement l'Arène", () => {
    expect(defisDuJour({ quiz: { faits: 0, total: 0, href: "/" }, solo: solo0, multi: 0, matiere: null }).map((x) => x.id)).toEqual(["arene"]);
  });
  it("l'Arène compte seul contre des bots comme entre amis", () => {
    const f = (multi: number, arene: number) => defisDuJour({ quiz: { faits: 0, total: 0, href: "/" }, solo: { ...solo0, arene }, multi, matiere: null })[0].fait;
    expect([f(0, 0), f(1, 0), f(0, 1)]).toEqual([false, true, true]);
  });
});

describe("succès", () => {
  const base: EntreeSucces = { today: "2026-11-28", visites: [], vitrine: vitrine([], "u", "2026-11-28"), solo: solo0,
    areneParties: 0, semainesGagnees: 0, plusRapide: false, plusAssidu: false };
  const un = (e: Partial<EntreeSucces>, id: string) => succes({ ...base, ...e }).find((s) => s.id === id)!;
  const jours = (fin: number, n: number) => Array.from({ length: n }, (_, i) => `2026-11-${String(fin - i).padStart(2, "0")}`);

  it("Fidèle : 7 jours de visite d'affilée ; sinon la série en cours", () => {
    expect(un({ visites: jours(28, 7) }, "fidele-7")).toMatchObject({ obtenu: true, progres: { n: 7, cible: 7 } });
    expect(un({ visites: jours(28, 4) }, "fidele-7")).toMatchObject({ obtenu: false, progres: { n: 4, cible: 7 } });
    expect(un({ visites: jours(20, 3) }, "fidele-7").progres?.n).toBe(0); // série interrompue
  });
  it("reste obtenu après une série passée", () => {
    expect(un({ visites: jours(15, 8) }, "fidele-7").obtenu).toBe(true);
  });
  it("paliers solo et Arène (parties classées + contre des bots)", () => {
    expect(un({ solo: { ...solo0, flashcards: 12 } }, "flashcards")).toMatchObject({ obtenu: true, progres: { n: 10, cible: 10 } });
    expect(un({ solo: { ...solo0, arene: 4 }, areneParties: 6 }, "gladiateur").obtenu).toBe(true);
  });
  it("reprend les badges des quiz du jour", () => {
    expect(succes(base).some((s) => s.id === "serie-7")).toBe(true);
  });
});

describe("titres du groupe", () => {
  it("le plus rapide (au moins 3 quiz) et le plus assidu", () => {
    const t = titresDuGroupe([
      { userId: "A", quiz: 5, dureeMoyMs: 90_000 }, { userId: "B", quiz: 3, dureeMoyMs: 60_000 }, { userId: "C", quiz: 2, dureeMoyMs: 10_000 },
    ]);
    expect([...t.plusRapide]).toEqual(["B"]); // C est plus rapide mais n'a que 2 quiz
    expect([...t.plusAssidu]).toEqual(["A"]);
  });
  it("seul joueur : aucun titre", () => {
    const t = titresDuGroupe([{ userId: "A", quiz: 9, dureeMoyMs: 1 }]);
    expect(t.plusRapide.size + t.plusAssidu.size).toBe(0);
  });
});
