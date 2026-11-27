import { describe, it, expect } from "vitest";
import { ligueDe, series, vitrine, exploitsDuJour, calculerTrophees, deltaJoueur, type Resultat, type JourJeu } from "./trophees";

describe("ligues", () => {
  it("Bronze au départ, avec la progression vers Argent", () => {
    expect(ligueDe(0)).toMatchObject({ index: 0, manque: 100, progression: 0 });
    expect(ligueDe(0).ligue.nom).toBe("Bronze");
    expect(ligueDe(50).progression).toBeCloseTo(0.5);
  });
  it("change de ligue pile au seuil", () => {
    expect(ligueDe(99).ligue.nom).toBe("Bronze");
    expect(ligueDe(100).ligue.nom).toBe("Argent");
    expect(ligueDe(800).ligue.nom).toBe("Diamant");
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

const jj = (dayId: string, date: string, res: [string, number, number][], passe = true, subjectId = "M"): JourJeu =>
  ({ dayId, date, subjectId, passe, resultats: res.map(([userId, erreurs, dureeMs]) => ({ userId, erreurs, dureeMs })) });

describe("trophées façon Clash Royale", () => {
  it("groupe de 5 : +40, +20, 0, −20, −40", () => {
    const res: [string, number, number][] = [["A", 0, 10], ["B", 0, 20], ["C", 1, 5], ["D", 2, 5], ["E", 3, 5]];
    const j = jj("j", "2026-11-01", res).resultats;
    expect(["A", "B", "C", "D", "E"].map((u) => deltaJoueur(j, u))).toEqual([40, 20, 0, -20, -40]);
  });
  it("égalité parfaite : 0 trophée l'un sur l'autre", () => {
    const j = jj("j", "2026-11-01", [["A", 1, 10], ["B", 1, 10]]).resultats;
    expect(deltaJoueur(j, "A")).toBe(0);
  });
  it("jamais sous 0", () => {
    const t = calculerTrophees([jj("j1", "2026-11-01", [["A", 0, 1], ["B", 5, 1]])], ["A", "B"]);
    expect(t.total.get("A")).toBe(10);
    expect(t.total.get("B")).toBe(0);
    expect(t.deltas.get("j1")!.get("B")).toBe(-10);
  });
  it("on ne retombe pas sous le palier d'une ligue atteinte (Argent = 100)", () => {
    const gagne = Array.from({ length: 10 }, (_, i) => jj(`g${i}`, `2026-11-${String(i + 1).padStart(2, "0")}`, [["A", 0, 1], ["B", 5, 1]]));
    const perd = Array.from({ length: 5 }, (_, i) => jj(`p${i}`, `2026-11-${String(i + 11).padStart(2, "0")}`, [["A", 5, 1], ["B", 0, 1]]));
    const t = calculerTrophees([...gagne, ...perd], ["A", "B"]);
    expect(t.total.get("A")).toBe(100); // 100 atteint, puis 5 défaites : reste à 100
    expect(t.total.get("B")).toBe(50); // 0 (plancher) puis +50
  });
  it("absence : −10 seulement les jours passés d'une matière où l'on a déjà joué", () => {
    const jours = [
      jj("a", "2026-11-01", [["A", 0, 1], ["B", 1, 1]]), // A +10
      jj("b", "2026-11-02", [["A", 0, 1], ["B", 1, 1]]), // A +10 → 20
      jj("c", "2026-11-03", [["B", 0, 1]]), // A absent → 10
      jj("d", "2026-11-04", [["B", 0, 1]], false), // aujourd'hui, pas encore joué : rien
      jj("e", "2026-11-03", [["B", 0, 1]], true, "AUTRE"), // jamais joué cette matière : rien
    ];
    const t = calculerTrophees(jours, ["A", "B"]);
    expect(t.total.get("A")).toBe(10);
    expect(t.deltas.get("c")!.get("A")).toBe(-10);
    expect(t.deltas.get("d")!.has("A")).toBe(false);
    expect(t.deltas.get("e")!.has("A")).toBe(false);
  });
});
