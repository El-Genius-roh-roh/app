import { describe, it, expect } from "vitest";
import { classementDuJour, dernierQuart, facteurRetard, multiplicateur } from "./scoring";

describe("multiplicateur", () => {
  it("linéaire", () => {
    expect(multiplicateur(1)).toBeCloseTo(1);
    expect(multiplicateur(10)).toBeCloseTo(1.45);
    expect(multiplicateur(20)).toBeCloseTo(1.95);
    expect(multiplicateur(30)).toBeCloseTo(2.45);
    expect(multiplicateur(60)).toBeCloseTo(3.95);
  });
});

describe("exemple A — jour 11", () => {
  const r = classementDuJour(
    [
      { userId: "Alice", erreurs: 0, dureeMs: 42300 },
      { userId: "Bob", erreurs: 0, dureeMs: 51000 },
      { userId: "Chloé", erreurs: 1, dureeMs: 39000 },
      { userId: "David", erreurs: 1, dureeMs: 39000 },
      { userId: "Emma", erreurs: 3, dureeMs: 30000 },
    ],
    11,
  );
  const get = (n: string) => r.find((x) => x.userId === n)!;
  it.each([
    ["Alice", 1, 4, 50, 75],
    ["Bob", 2, 3, 40, 60],
    ["Chloé", 3, 1, 20, 30],
    ["David", 3, 1, 20, 30],
    ["Emma", 5, 0, 10, 15],
  ])("%s", (n, rang, battus, base, points) => {
    expect(get(n)).toMatchObject({ rang, battus, base, points });
  });
});

describe("arrondi .5 vers le haut", () => {
  it("jour 2 (×1,05) : 30 × 1,05 = 31,5 → 32", () => {
    const r = classementDuJour([{ userId: "A", erreurs: 0, dureeMs: 1 }, { userId: "B", erreurs: 0, dureeMs: 2 }, { userId: "C", erreurs: 1, dureeMs: 1 }], 2);
    expect(r[0]).toMatchObject({ battus: 2, base: 30, points: 32 });
  });
});

describe("exemple C — joueur seul jour 1", () => {
  it("10 points", () => {
    const [r] = classementDuJour([{ userId: "X", erreurs: 2, dureeMs: 1000 }], 1);
    expect(r).toMatchObject({ rang: 1, battus: 0, base: 10, points: 10 });
  });
});

describe("exemple B — absent", () => {
  it("un absent n'apparaît pas et ne compte pas comme battu", () => {
    const r = classementDuJour([{ userId: "A", erreurs: 0, dureeMs: 1 }], 11);
    expect(r.find((x) => x.userId === "Fanny")).toBeUndefined();
    expect(r[0].battus).toBe(0);
  });
});

import { classementCumule } from "./scoring";

describe("classement cumulé (saison / général)", () => {
  const c = (userId: string, points: number, erreurs: number, dureeMs: number) => ({ userId, points, erreurs, dureeMs });
  it("trie par points décroissants", () => {
    const r = classementCumule([c("a", 10, 0, 1), c("b", 30, 5, 9), c("c", 20, 0, 1)]);
    expect(r.map((x) => x.userId)).toEqual(["b", "c", "a"]);
    expect(r.map((x) => x.rang)).toEqual([1, 2, 3]);
  });
  it("départage les égalités par erreurs puis par temps", () => {
    const r = classementCumule([c("a", 50, 3, 100), c("b", 50, 2, 900), c("c", 50, 2, 800)]);
    expect(r.map((x) => x.userId)).toEqual(["c", "b", "a"]);
    expect(r.map((x) => x.rang)).toEqual([1, 2, 3]);
  });
  it("égalité parfaite : même rang, puis rang suivant sauté (1, 2, 2, 4)", () => {
    const r = classementCumule([c("a", 50, 1, 10), c("b", 40, 1, 10), c("c", 40, 1, 10), c("d", 5, 0, 0)]);
    expect(r.map((x) => x.rang)).toEqual([1, 2, 2, 4]);
  });
  it("un joueur à 0 point reste classé en dernier", () => {
    const r = classementCumule([c("z", 0, 0, 0), c("a", 10, 9, 99)]);
    expect(r.map((x) => x.userId)).toEqual(["a", "z"]);
  });
});

describe("rattrapage : −10 % de gemmes par jour de retard", () => {
  it("facteur 1 ; 0,9 ; 0,8 ; 0,7", () => {
    expect([0, 1, 2, 3].map(facteurRetard)).toEqual([1, 0.9, 0.8, 0.7]);
  });
  it("le retard ne change pas le rang, seulement les gemmes", () => {
    const r = classementDuJour([{ userId: "A", erreurs: 0, dureeMs: 1, retard: 2 }, { userId: "B", erreurs: 1, dureeMs: 1 }], 1);
    expect(r[0]).toMatchObject({ userId: "A", rang: 1, battus: 1, base: 20, points: 16 });
    expect(r[1]).toMatchObject({ userId: "B", rang: 2, points: 10 });
  });
});

describe("classement au temps (Memory du jour, D46)", () => {
  it("le plus rapide gagne, quelles que soient les erreurs", () => {
    const r = classementDuJour([
      { userId: "A", erreurs: 5, dureeMs: 40_000 },
      { userId: "B", erreurs: 0, dureeMs: 60_000 },
    ], 1, "temps");
    expect(r.find((x) => x.userId === "A")!.rang).toBe(1);
    expect(r.find((x) => x.userId === "B")!.rang).toBe(2);
    expect(r.find((x) => x.userId === "A")!.points).toBe(20);
  });
});

describe("encouragement du dernier quart (D51)", () => {
  const cl = (...rangs: number[]) => rangs.map((rang, i) => ({ userId: String.fromCharCode(65 + i), rang }));
  it("dernier quart arrondi au-dessus", () => {
    expect([...dernierQuart(cl(1, 2))]).toEqual(["B"]);
    expect([...dernierQuart(cl(1, 2, 3, 4))]).toEqual(["D"]);
    expect([...dernierQuart(cl(1, 2, 3, 4, 5))]).toEqual(["D", "E"]);
    expect([...dernierQuart(cl(1, 2, 3, 4, 5, 6, 7, 8))]).toEqual(["G", "H"]);
  });
  it("personne avant le premier classement, ni seul", () => {
    expect(dernierQuart([]).size).toBe(0);
    expect(dernierQuart(cl(1)).size).toBe(0);
  });
  it("ex æquo à la limite : dedans si leur rang y est", () => {
    expect([...dernierQuart(cl(1, 2, 3, 3))]).toEqual(["C", "D"]);
    expect(dernierQuart(cl(1, 1)).size).toBe(0);
  });
  it("+20 % de gemmes, sans changer le rang", () => {
    const r = classementDuJour([
      { userId: "A", erreurs: 0, dureeMs: 1000 },
      { userId: "B", erreurs: 1, dureeMs: 1000, encouragement: true },
    ], 1);
    expect(r.map((x) => [x.userId, x.rang, x.points])).toEqual([["A", 1, 20], ["B", 2, 12]]);
  });
});
