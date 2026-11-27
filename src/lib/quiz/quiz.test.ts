import { describe, it, expect } from "vitest";
import { generateQuestions, validateTechnical, qkey, type SrcPage } from "./generate";
import { verifyQuestion } from "./verify";
import { rng, shuffled } from "../rng";

const SLIDES: [string, string[]][] = [
  ["La glycolyse", ["Se déroule dans le cytosol.", "Une molécule de glucose donne 2 pyruvates.", "Bilan net : 2 ATP et 2 NADH."]],
  ["Le cycle de Krebs", ["Se déroule dans la matrice mitochondriale.", "Produit NADH, FADH2 et du CO2.", "L'acétyl-CoA entre dans le cycle."]],
  ["La mitose", ["Prophase, métaphase, anaphase, télophase.", "Les chromatides sœurs se séparent en anaphase.", "Produit deux cellules filles identiques."]],
  ["La méiose", ["Deux divisions successives.", "Produit quatre cellules haploïdes.", "Le crossing-over a lieu en prophase I."]],
  ["La réplication", ["Semi-conservative.", "L'ADN polymérase synthétise de 5' vers 3'.", "Le brin tardif est synthétisé en fragments d'Okazaki."]],
  ["La traduction", ["Se déroule sur les ribosomes.", "Chaque codon code un acide aminé.", "Le codon AUG est le codon d'initiation."]],
  ["La membrane", ["Bicouche de phospholipides.", "Les protéines assurent le transport.", "Le cholestérol régule la fluidité."]],
  ["Le noyau", ["Contient l'ADN chromosomique.", "Le nucléole produit les sous-unités des ribosomes.", "Les pores contrôlent les échanges."]],
];
const pages: SrcPage[] = SLIDES.map(([t, b], i) => ({
  id: "p" + i, document_id: "d1", numero: i + 1, notion: t, texte: `Chapitre\n${t}\n` + b.map((x) => "- " + x).join("\n"),
}));

const gen = (o: Partial<Parameters<typeof generateQuestions>[0]> = {}) =>
  generateQuestions({ kind: "new", count: 7, pages: pages.slice(0, 7), pool: pages, used: new Set(), seed: 42, round: 0, ...o });

describe("génération simulée", () => {
  const qs = gen();
  it("produit le nombre demandé de questions valides", () => {
    expect(qs).toHaveLength(7);
    for (const q of qs) expect(validateTechnical(q, new Set())).toBeNull();
  });
  it("une seule bonne réponse, vérifiée par le correcteur indépendant", () => {
    for (const q of qs) {
      const src = pages.filter((p) => q.source.page_ids.includes(p.id)).map((p) => p.texte);
      expect(verifyQuestion(q, src, q.correct_index).ok).toBe(true);
    }
  });
  it("environ 20 % de vrai/faux, le reste en QCM à 4 choix", () => {
    const all = gen({ count: 10, pages });
    expect(all.filter((q) => q.type === "vrai_faux").length).toBe(2);
    expect(all.filter((q) => q.type === "qcm").every((q) => q.choix.length === 4)).toBe(true);
  });
  it("jamais deux fois la même notion avec assez de pages", () => {
    expect(new Set(qs.map((q) => q.notion)).size).toBe(qs.length);
  });
  it("évite les questions déjà posées", () => {
    const used = new Set(qs.map(qkey));
    const again = gen({ used });
    expect(again.length).toBeGreaterThan(0);
    for (const q of again) expect(used.has(qkey(q))).toBe(false);
  });
  it("une même notion peut revenir avec une autre bonne réponse (révision)", () => {
    const used = new Set(qs.map(qkey));
    const rev = gen({ kind: "revision", count: 3, pages: pages.slice(0, 1), used, round: 1 });
    expect(rev.length).toBeGreaterThan(0);
    expect(rev[0].notion).toBe(pages[0].notion);
  });
  it("est déterministe pour une graine donnée", () => {
    expect(gen()).toEqual(gen());
  });
});

describe("vérificateur", () => {
  const q = gen()[0];
  const src = pages.filter((p) => q.source.page_ids.includes(p.id)).map((p) => p.texte);
  it("rejette une question dont la réponse attendue est fausse", () => {
    const wrong = (q.correct_index + 1) % q.choix.length;
    expect(verifyQuestion(q, src, wrong).ok).toBe(false);
  });
  it("rejette une question ambiguë (deux choix présents dans les slides)", () => {
    const two = { ...q, type: "qcm" as const, choix: [q.choix[q.correct_index], pages[0].texte.includes("cytosol") ? "Se déroule dans le cytosol." : "Bilan net : 2 ATP et 2 NADH.", "x1", "x2"] };
    const v = verifyQuestion(two, [pages[0].texte], 0);
    expect(v.ambiguous || !v.ok).toBe(true);
  });
  it("rejette une question hors programme", () => {
    expect(verifyQuestion(q, ["Texte sans rapport."], q.correct_index).ok).toBe(false);
  });
});

describe("validation technique", () => {
  it("détecte choix en double, index hors bornes et doublon", () => {
    const base = gen()[0];
    expect(validateTechnical({ ...base, type: "qcm", choix: ["a", "a", "b", "c"] }, new Set())).not.toBeNull();
    expect(validateTechnical({ ...base, correct_index: 9 }, new Set())).not.toBeNull();
    expect(validateTechnical(base, new Set([qkey(base)]))).not.toBeNull();
  });
});

describe("mélange", () => {
  it("est une permutation", () => {
    const a = [0, 1, 2, 3, 4, 5];
    expect([...shuffled(a, rng(1))].sort()).toEqual(a);
  });
});
