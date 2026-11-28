import { describe, expect, it } from "vitest";
import { JEU_DU_JOUR } from "@/config/constants";
import { jeuDuJour, jeuFait, JEUX, lienDuJeu, numeroDuJour } from "./jeu-du-jour";
import { addDays } from "./clock";

describe("mini-jeu du jour", () => {
  it("le même jeu toute la journée, un autre le lendemain", () => {
    expect(jeuDuJour("2026-11-28").id).toBe(jeuDuJour("2026-11-28").id);
    expect(jeuDuJour("2026-11-29").id).not.toBe(jeuDuJour("2026-11-28").id);
  });
  it("tous les jeux passent, un par jour, puis la rotation recommence", () => {
    const n = JEU_DU_JOUR.ROTATION.length;
    const jours = Array.from({ length: n }, (_, i) => jeuDuJour(addDays("2026-11-28", i)).id);
    expect(new Set(jours).size).toBe(n);
    expect(jeuDuJour(addDays("2026-11-28", n)).id).toBe(jours[0]);
  });
  it("numéro du jour : un de plus chaque jour, même au changement d'année", () => {
    expect(numeroDuJour("1970-01-02")).toBe(1);
    expect(numeroDuJour("2027-01-01") - numeroDuJour("2026-12-31")).toBe(1);
  });
  it("lien : la matière pour Relier et le Memory, l'Arène pour les parties avec des bots", () => {
    expect(lienDuJeu(JEUX.relier, "m")).toBe("/matieres/m/relier");
    expect(lienDuJeu(JEUX.memory, null)).toBeNull();
    expect(lienDuJeu(JEUX.vf, null)).toBe("/arene#jeu-du-jour");
  });
  it("fait : une session du bon type ; pour un jeu d'Arène, une partie entre amis compte aussi", () => {
    expect(jeuFait(JEUX.relier, { memory: 1 }, 0)).toBe(false);
    expect(jeuFait(JEUX.relier, { relier: 1 }, 0)).toBe(true);
    expect(jeuFait(JEUX.blitz, { arene: 0 }, 1)).toBe(true);
    expect(jeuFait(JEUX.memory, {}, 3)).toBe(false);
  });
});
