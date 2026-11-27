import { describe, it, expect } from "vitest";
import { cleanText, fixAccents } from "./pdf";

describe("nettoyage du texte des PDF", () => {
  it("retire les caractères nuls refusés par Postgres", () => {
    expect(cleanText("Mo\u0000dèle\u0001 linéaire")).toBe("Modèle linéaire");
  });
  it("recolle les accents détachés des PDF LaTeX", () => {
    expect(fixAccents("R´ egression lin´ eaire")).toBe("Régression linéaire");
    expect(fixAccents("chercheur ` a l’Ensai")).toBe("chercheur à l’Ensai");
    expect(fixAccents("ˆ etre na¨ ıf fran¸ cais")).toBe("être naïf français");
  });
  it("ne touche pas aux formules", () => {
    expect(fixAccents("a^2 + b")).toBe("a^2 + b");
  });
});
