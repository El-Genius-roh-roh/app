import { describe, it, expect } from "vitest";
import { ligueDe, series, vitrine, exploitsDuJour, type Resultat } from "./trophees";

describe("ligues", () => {
  it("Bronze au départ, avec la progression vers Argent", () => {
    expect(ligueDe(0)).toMatchObject({ index: 0, manque: 200, progression: 0 });
    expect(ligueDe(0).ligue.nom).toBe("Bronze");
    expect(ligueDe(100).progression).toBeCloseTo(0.5);
  });
  it("change de ligue pile au seuil", () => {
    expect(ligueDe(199).ligue.nom).toBe("Bronze");
    expect(ligueDe(200).ligue.nom).toBe("Argent");
    expect(ligueDe(2000).ligue.nom).toBe("Diamant");
  });
  it("ligue maximale : plus de suivante", () => {
    expect(ligueDe(99999)).toMatchObject({ suivante: null, progression: 1, manque: 0 });
  });
});

describe("séries de jours", () => {
  it("plus longue série et série en cours", () => {
    const d = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-05", "2026-11-06"];
    expect(series(d, "2026-11-06")).toEqual({ max: 3, actuelle: 2 });
    expect(series(d, "2026-11-07")).toEqual({ max: 3, actuelle: 2 }); // hier compte encore
    expect(series(d, "2026-11-08")).toEqual({ max: 3, actuelle: 0 }); // série cassée
  });
  it("plusieurs matières le même jour comptent pour un seul jour, à cheval sur deux mois", () => {
    expect(series(["2026-10-31", "2026-10-31", "2026-11-01"], "2026-11-01")).toEqual({ max: 2, actuelle: 2 });
  });
});

const r = (dayId: string, userId: string, rang: number, erreurs: number, dureeMs: number, date = "2026-11-01"): Resultat =>
  ({ dayId, date, userId, rang, erreurs, dureeMs });

describe("exploits du jour", () => {
  it("seul ce jour-là : ni 1er ni plus rapide, mais sans faute possible", () => {
    expect(exploitsDuJour([r("j", "A", 1, 0, 5000)], "A")).toEqual({ premier: false, sansFaute: true, plusRapide: false });
  });
  it("le 1er n'est pas forcément le plus rapide (les erreurs passent avant le temps)", () => {
    const jour = [r("j", "A", 1, 0, 50000), r("j", "B", 2, 2, 20000)];
    expect(exploitsDuJour(jour, "A")).toMatchObject({ premier: true, plusRapide: false });
    expect(exploitsDuJour(jour, "B")).toMatchObject({ premier: false, plusRapide: true });
  });
});

describe("vitrine", () => {
  it("compte les trophées cumulables et débloque les séries", () => {
    const res = [
      r("j1", "A", 1, 0, 1000, "2026-11-01"), r("j1", "B", 2, 1, 900, "2026-11-01"),
      r("j2", "A", 1, 0, 800, "2026-11-02"), r("j2", "B", 2, 0, 900, "2026-11-02"),
      r("j3", "A", 2, 1, 800, "2026-11-03"), r("j3", "B", 1, 0, 700, "2026-11-03"),
    ];
    const v = vitrine(res, "A", "2026-11-03");
    const n = (id: string) => v.trophees.find((t) => t.id === id)!.nombre;
    expect(n("premier")).toBe(2);
    expect(n("sans-faute")).toBe(2);
    expect(n("rapide")).toBe(1);
    expect(n("serie-3")).toBe(1);
    expect(n("serie-7")).toBe(0);
    expect(v).toMatchObject({ serieActuelle: 3, serieMax: 3, quizJoues: 3 });
  });
});
