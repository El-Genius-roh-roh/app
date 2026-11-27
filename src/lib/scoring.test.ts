import { describe, it, expect } from "vitest";
import { classementDuJour, multiplicateur } from "./scoring";

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
    ["Alice", 1, 4, 30, 45],
    ["Bob", 2, 3, 25, 38],
    ["Chloé", 3, 1, 15, 23],
    ["David", 3, 1, 15, 23],
    ["Emma", 5, 0, 10, 15],
  ])("%s", (n, rang, battus, base, points) => {
    expect(get(n)).toMatchObject({ rang, battus, base, points });
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
