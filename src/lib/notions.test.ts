import { describe, expect, it } from "vitest";
import { ancrer, detecterDefinitions, lireReponseIA, normTerme } from "./notions";

const page = (numero: number, ...ls: string[]) => ({ numero, texte: ls.join("\n") });

describe("détection sans IA", () => {
  it("« Terme : définition » sur une diapo à puces", () => {
    const n = detecterDefinitions([page(4, "Procaryotes et eucaryotes", "- Procaryote : pas de noyau, ADN dans le nucléoïde.", "- Eucaryote : noyau délimité par une enveloppe nucléaire.")]);
    expect(n).toEqual([
      { terme: "Procaryote", definition: "Pas de noyau, ADN dans le nucléoïde.", page: 4 },
      { terme: "Eucaryote", definition: "Noyau délimité par une enveloppe nucléaire.", page: 4 },
    ]);
  });
  it("« L'X est … » et « X désigne … »", () => {
    const n = detecterDefinitions([page(1, "- L'ATP est la monnaie énergétique de la cellule.", "Le biais désigne l'écart entre l'espérance de l'estimateur et le paramètre.")]);
    expect(n.map((x) => [x.terme, x.definition])).toEqual([
      ["ATP", "La monnaie énergétique de la cellule."],
      ["Biais", "L'écart entre l'espérance de l'estimateur et le paramètre."],
    ]);
  });
  it("« On appelle X … »", () => {
    const [n] = detecterDefinitions([page(2, "On appelle estimateur toute fonction des observations.")]);
    expect(n).toMatchObject({ terme: "Estimateur", definition: "Toute fonction des observations." });
  });
  it("titre « Définition de X » suivi de sa première ligne", () => {
    const [n] = detecterDefinitions([page(3, "Définition de la cellule", "- Unité structurale et fonctionnelle du vivant.", "- Taille typique : 1 à 100 micromètres.")]);
    expect(n).toMatchObject({ terme: "Cellule", definition: "Unité structurale et fonctionnelle du vivant." });
  });
  it("ignore les étiquettes de diapo, les formules, les phrases longues et les définitions trop courtes", () => {
    const n = detecterDefinitions([page(5,
      "- Bilan net : 2 ATP et 2 NADH.", "- Taille typique : 1 à 100 micromètres.", "Exemple : on lance un dé.",
      "P(A|B) = P(B|A)P(A)/P(B) : formule de Bayes appliquée", "La réplication de l'ADN dans la cellule est semi-conservative.",
      "Phases : G1, S, G2 puis M.", "Rendement : faible.", "- Rendement faible : 2 ATP par glucose.")]);
    expect(n).toEqual([]);
  });
  it("un terme n'apparaît qu'une fois", () => {
    const n = detecterDefinitions([page(1, "Mitose : division en deux cellules filles identiques."), page(2, "La mitose est une division cellulaire conservatrice.")]);
    expect(n).toHaveLength(1);
  });
});

describe("IA", () => {
  const pages = [page(7, "Le cycle de Krebs se déroule dans la matrice mitochondriale."), page(8, "La glycolyse se déroule dans le cytosol.")];
  it("lit un tableau JSON, même entouré de texte", () => {
    expect(lireReponseIA('Voici : ```json\n[{"terme":"Glycolyse","definition":"Dégradation du glucose en pyruvate.","page":8}]\n```')).toEqual([
      { terme: "Glycolyse", definition: "Dégradation du glucose en pyruvate.", page: 8 },
    ]);
    expect(() => lireReponseIA("pas de JSON")).toThrow();
    expect(() => lireReponseIA("[{oops}]")).toThrow();
  });
  it("ignore la réflexion et les crochets parasites avant le tableau, répare le LaTeX", () => {
    // réponse brute du modèle : « \mu » et « \sigma » ne sont pas des échappements JSON valides
    const brut = String.raw`<think>voir [page 3]</think>Notions [p. 8] :
[{"terme":"Variance","definition":"Espérance de $(X-\mu)^2$, notée $\sigma^2$.","page":8}]`;
    expect(lireReponseIA(brut)).toEqual([{ terme: "Variance", definition: String.raw`Espérance de $(X-\mu)^2$, notée $\sigma^2$.`, page: 8 }]);
    expect(lireReponseIA("Aucune : []")).toEqual([]);
  });
  it("ne garde que les termes présents dans la page citée (garde-fou contre les inventions)", () => {
    const n = ancrer([
      { terme: "Glycolyse", definition: "Dégradation du glucose en pyruvate.", page: 8 },
      { terme: "Cycle de Krebs", definition: "Cycle de réactions dans la matrice mitochondriale.", page: 7 },
      { terme: "Photosynthèse", definition: "Production de glucose à partir de lumière.", page: 8 }, // absent du texte
      { terme: "Glycolyse", definition: "Glycolyse", page: 8 }, // définition = terme
      { terme: "Cytosol", definition: "Liquide intracellulaire.", page: 7 }, // présent page 8, pas page 7
    ], pages);
    expect(n.map((x) => x.terme)).toEqual(["Glycolyse", "Cycle de Krebs"]);
  });
  it("compare sans accents ni casse", () => {
    expect(normTerme("Épissage  de l’ARN")).toBe("epissage de l'arn");
  });
});
