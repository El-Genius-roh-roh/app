import { describe, it, expect } from "vitest";
import { paires, distribuer, vontEnsemble, meilleur, type QuestionSource } from "./memory";
import { rng } from "./rng";

const qcm = (id: string, enonce: string, bonne: string): QuestionSource => ({ id, type: "qcm", enonce, choix: ["x", bonne], correct_index: 1 });

describe("paires", () => {
  it("énoncé ↔ bonne réponse, sans les vrai/faux", () => {
    const p = paires([qcm("a", "Variance de P(λ) ?", "λ"), { id: "b", type: "vrai_faux", enonce: "Vrai ?", choix: ["Vrai", "Faux"], correct_index: 0 }]);
    expect(p).toEqual([{ id: "a", notion: "Variance de P(λ) ?", definition: "λ" }]);
  });
  it("écarte les doublons de réponse ou d'énoncé (association ambiguë)", () => {
    const p = paires([qcm("a", "Espérance de B(n,p) ?", "np"), qcm("b", "Moyenne de B(n,p) ?", "NP "), qcm("c", "Espérance de B(n,p)", "autre")]);
    expect(p.map((x) => x.id)).toEqual(["a"]);
  });
  it("écarte les textes trop longs", () => {
    expect(paires([qcm("a", "x".repeat(50), "ok")], { notion: 40, definition: 80 })).toEqual([]);
  });
});

describe("distribuer", () => {
  const source = paires(Array.from({ length: 10 }, (_, i) => qcm(`q${i}`, `Question ${i}`, `Réponse ${i}`)));
  it("2n cartes, chaque paire une fois de chaque côté", () => {
    const d = distribuer(source, 6, rng(1));
    expect(d).toHaveLength(12);
    for (const id of new Set(d.map((c) => c.paire))) expect(d.filter((c) => c.paire === id).map((c) => c.face).sort()).toEqual(["definition", "notion"]);
    expect(new Set(d.map((c) => c.cle)).size).toBe(12);
  });
  it("moins de paires disponibles que demandé : toutes", () => {
    expect(distribuer(source.slice(0, 3), 6, rng(2))).toHaveLength(6);
  });
  it("vontEnsemble : même paire, faces différentes", () => {
    const d = distribuer(source, 2, rng(3));
    const [n] = d.filter((c) => c.face === "notion");
    const def = d.find((c) => c.paire === n.paire && c.face === "definition")!;
    expect(vontEnsemble(n, def)).toBe(true);
    expect(vontEnsemble(n, n)).toBe(false);
    expect(vontEnsemble(n, d.find((c) => c.paire !== n.paire)!)).toBe(false);
  });
});

describe("meilleur", () => {
  it("moins de coups, puis plus rapide", () => {
    expect(meilleur(null, { coups: 9, ms: 5 })).toEqual({ coups: 9, ms: 5 });
    expect(meilleur({ coups: 8, ms: 9 }, { coups: 9, ms: 1 })).toEqual({ coups: 8, ms: 9 });
    expect(meilleur({ coups: 8, ms: 9 }, { coups: 8, ms: 3 })).toEqual({ coups: 8, ms: 3 });
  });
});
