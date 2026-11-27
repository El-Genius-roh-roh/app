import { describe, it, expect } from "vitest";
import { splitIntoDays, type SplitPage } from "./split";

const mk = (n: number, dens = 3, chap = (i: number) => "C" + Math.floor(i / 100)): SplitPage[] =>
  Array.from({ length: n }, (_, i) => ({ id: "p" + i, densite: dens, chapitre: chap(i) }));

describe("splitIntoDays", () => {
  it("répartit équitablement des pages de même densité", () => {
    const days = splitIntoDays(mk(12), 4);
    expect(days.map((d) => d.length)).toEqual([3, 3, 3, 3]);
  });
  it("conserve l'ordre et toutes les pages exactement une fois", () => {
    const pages = mk(17, 2);
    const flat = splitIntoDays(pages, 5).flat();
    expect(flat).toEqual(pages.map((p) => p.id));
  });
  it("tient compte de la densité, pas du nombre de pages", () => {
    const pages: SplitPage[] = [
      ...Array.from({ length: 10 }, (_, i) => ({ id: "t" + i, densite: 1, chapitre: "A" })),
      ...Array.from({ length: 2 }, (_, i) => ({ id: "d" + i, densite: 5, chapitre: "A" })),
    ];
    const days = splitIntoDays(pages, 2);
    expect(days[0].length).toBe(10);
    expect(days[1]).toEqual(["d0", "d1"]);
  });
  it("préfère une frontière de chapitre proche de la cible", () => {
    // 11 pages densité 1 (2 jours => cible 5.5) ; chapitre change après la page 5 (acc=5, écart 9 %)
    const pages = mk(11, 1, (i) => (i < 5 ? "A" : "B"));
    const days = splitIntoDays(pages, 2);
    expect(days[0].length).toBe(5);
  });
  it("ignore une frontière de chapitre trop éloignée de la cible", () => {
    const pages = mk(10, 1, (i) => (i < 2 ? "A" : "B")); // cible 5, frontière à 2 (écart 60 %)
    const days = splitIntoDays(pages, 2);
    expect(days[0].length).toBe(5);
  });
  it("jours vides (révision) quand il y a moins de pages que de jours", () => {
    const days = splitIntoDays(mk(2), 5);
    expect(days.length).toBe(5);
    expect(days.flat().length).toBe(2);
    expect(days.filter((d) => d.length === 0).length).toBeGreaterThanOrEqual(3);
  });
  it("les pages de densité 0 ne comptent pas", () => {
    const pages: SplitPage[] = [
      { id: "titre", densite: 0, chapitre: "A" },
      ...mk(4, 2, () => "A"),
      { id: "merci", densite: 0, chapitre: "A" },
    ];
    const days = splitIntoDays(pages, 2);
    expect(days.flat().length).toBe(6);
    expect(days[0][0]).toBe("titre");
    expect(days[1].at(-1)).toBe("merci");
  });
});
