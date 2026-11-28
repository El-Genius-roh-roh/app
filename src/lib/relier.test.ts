import { describe, expect, it } from "vitest";
import { donne, relies } from "./relier";
import { rng } from "./rng";

const source = ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({ id, notion: `terme ${id}`, definition: `définition ${id}` }));

describe("Relier", () => {
  it("n paires : les mêmes dans les deux colonnes, chaque texte avec sa paire", () => {
    const d = donne(source, 5, rng(1));
    expect(d.termes).toHaveLength(5);
    expect(d.definitions.map((x) => x.id).sort()).toEqual(d.termes.map((x) => x.id).sort());
    for (const t of d.termes) expect(source.find((p) => p.id === t.id)!.notion).toBe(t.texte);
    for (const x of d.definitions) expect(source.find((p) => p.id === x.id)!.definition).toBe(x.texte);
  });
  it("jamais toutes les définitions en face de leur terme", () => {
    for (let s = 1; s < 200; s++) {
      const d = donne(source.slice(0, 2), 2, rng(s));
      expect(d.definitions.map((x) => x.id)).not.toEqual(d.termes.map((x) => x.id));
    }
  });
  it("moins de paires que demandé : toutes", () => {
    expect(donne(source.slice(0, 3), 5, rng(2)).termes).toHaveLength(3);
  });
  it("relie un terme à sa propre définition seulement", () => {
    expect([relies("a", "a"), relies("a", "b")]).toEqual([true, false]);
  });
});
