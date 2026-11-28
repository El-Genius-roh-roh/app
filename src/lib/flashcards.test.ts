import { describe, expect, it } from "vitest";
import { acquises, BOITE_MAX, cartes, classer, nouvelleSession, paquet, repondre, type FlashSource } from "./flashcards";

const q = (id: string, enonce: string, choix: string[], correct_index: number, type = "qcm"): FlashSource =>
  ({ id, type, enonce, choix, correct_index, explication: `expl ${id}` });

describe("flashcards", () => {
  it("transforme QCM et vrai/faux en cartes recto/verso", () => {
    const c = cartes([q("a", "Capitale ?", ["Lyon", "Paris"], 1), q("b", "La Terre est ronde.", ["Vrai", "Faux"], 0, "vrai_faux")]);
    expect(c).toEqual([
      { id: "a", recto: "Capitale ?", verso: "Paris", explication: "expl a", vf: false },
      { id: "b", recto: "La Terre est ronde.", verso: "Vrai", explication: "expl b", vf: true },
    ]);
  });

  it("vrai/faux sans choix : Vrai ou Faux selon l'index", () => {
    expect(cartes([q("b", "x", [], 1, "vrai_faux")])[0].verso).toBe("Faux");
  });

  it("ignore les doublons d'énoncé et les cartes sans réponse", () => {
    const c = cartes([q("a", "Même  question", ["x"], 0), q("b", "même question", ["y"], 0), q("c", "Sans réponse", ["x"], 3), q("d", " ", ["x"], 0)]);
    expect(c.map((x) => x.id)).toEqual(["a"]);
  });

  it("le paquet commence par les cartes les moins sues", () => {
    const src = cartes([q("a", "A", ["1"], 0), q("b", "B", ["1"], 0), q("c", "C", ["1"], 0)]);
    const p = paquet(src, { a: 3, b: 1, c: 2 }, 2, () => 0.5);
    expect(p.map((x) => x.id)).toEqual(["b", "c"]);
  });

  it("classer : monte d'une boîte si su, retourne en boîte 1 sinon", () => {
    let b = classer({}, "a", true);
    expect(b.a).toBe(2);
    b = classer(classer(b, "a", true), "a", true);
    expect(b.a).toBe(BOITE_MAX);
    expect(classer(b, "a", false).a).toBe(1);
  });

  it("session : une carte à revoir repasse en fin de file jusqu'à être sue", () => {
    let s = nouvelleSession(["a", "b"]);
    s = repondre(s, false);
    expect(s.file).toEqual(["b", "a"]);
    s = repondre(s, true);
    s = repondre(s, true);
    expect(s).toEqual({ file: [], sues: ["b", "a"], ratees: ["a"] });
    expect(repondre(s, true)).toBe(s);
  });

  it("compte les cartes acquises", () => {
    const src = cartes([q("a", "A", ["1"], 0), q("b", "B", ["1"], 0)]);
    expect(acquises(src, { a: BOITE_MAX, b: 2 })).toBe(1);
  });
});
