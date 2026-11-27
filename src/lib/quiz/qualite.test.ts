import { describe, it, expect } from "vitest";
import { factsOf, horsMatiere, type SrcPage } from "./generate";
import { extractJson, fixLatexEscapes } from "./chat";
import { texParts } from "../tex";
import { mockAnalyzePages } from "../ai/mock";

const page = (texte: string, notion = texte.split("\n")[0]): SrcPage => ({ id: "p", document_id: "d", numero: 1, texte, notion });

describe("questions hors matière", () => {
  it("écarte les infos sur l'enseignant, les contacts et l'organisation", () => {
    expect(horsMatiere("Contact : jean.dupont@univ.fr")).toBe(true);
    expect(horsMatiere("Enseignant : M. Dupont")).toBe(true);
    expect(horsMatiere("Modalités d'évaluation : 40 % contrôle continu")).toBe(true);
    expect(horsMatiere("Bibliographie")).toBe(true);
  });
  it("garde le vocabulaire de la matière", () => {
    expect(horsMatiere("Le coefficient de corrélation est compris entre -1 et 1")).toBe(false);
    expect(horsMatiere("L'évaluation du modèle se fait sur un échantillon test")).toBe(false);
    expect(horsMatiere("Les références de la loi normale centrée réduite")).toBe(false);
  });
  it("aucune question sur une slide de présentation du cours", () => {
    expect(factsOf(page("Organisation du cours\n- Enseignant : M. Dupont, bureau B204\n- Permanences le mardi"))).toEqual([]);
    expect(mockAnalyzePages(["Contact\n- jean.dupont@univ.fr\n- Bureau B204"])[0]).toMatchObject({ type: "admin", densite: 0 });
  });
});

describe("exemples du cours", () => {
  it("aucune question sur les données d'une slide d'exemple", () => {
    expect(factsOf(page("Exemple : notes de la classe\n- Moyenne de Paul : 12,5 sur 20 au partiel"))).toEqual([]);
  });
  it("écarte un fait surtout chiffré, garde une propriété", () => {
    const f = factsOf(page("Régression\n- On obtient 3,2 puis 4,7 et enfin 12 sur l'échantillon\n- Les résidus sont centrés par construction"));
    expect(f).toEqual(["Les résidus sont centrés par construction"]);
  });
});

describe("réponses jamais coupées", () => {
  it("un fait trop long est écarté au lieu d'être tronqué", () => {
    const long = "- " + "Une propriété très longue ".repeat(12).trim();
    const f = factsOf(page("Titre\n" + long + "\n- Une phrase courte et complète du cours"));
    expect(f).toEqual(["Une phrase courte et complète du cours"]);
  });
});

describe("LaTeX dans la réponse du chat", () => {
  it("répare les antislashs non doublés sans casser les vrais échappements", () => {
    const raw = String.raw`{"e":"$\frac{a}{b}$ et $\beta \neq 0$, \"cité\"\nligne 2, $\{x\}$, $a\,b$"}`;
    expect(extractJson(raw)).toEqual({ e: String.raw`$\frac{a}{b}$ et $\beta \neq 0$, "cité"` + "\n" + String.raw`ligne 2, $\{x\}$, $a\,b$` });
  });
  it("laisse intact un JSON déjà correct", () => {
    const ok = JSON.stringify({ e: String.raw`$\frac{1}{n}\sum x_i$`, u: "é" });
    expect(fixLatexEscapes(ok)).toBe(ok);
    expect(extractJson(ok)).toEqual(JSON.parse(ok));
  });
});

describe("affichage LaTeX", () => {
  it("sépare texte et formules ($…$, $$…$$, \\(…\\))", () => {
    const p = texParts(String.raw`Si $x^2 = 4$ alors $$x = \pm 2$$ et \(y\) coûte 5 \$`);
    expect(p.map((x) => (x.math ? (x.display ? "D" : "M") : x.text))).toEqual(["Si ", "M", " alors ", "D", " et ", "M", " coûte 5 $"]);
    expect((p[1] as { html: string }).html).toContain("katex");
  });
  it("un texte sans formule reste tel quel", () => {
    expect(texParts("Vrai ou faux : la moyenne est robuste")).toEqual([{ math: false, text: "Vrai ou faux : la moyenne est robuste" }]);
  });
});
