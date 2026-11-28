import { describe, it, expect } from "vitest";
import { ligueDe, series, vitrine, exploitsDuJour, lundiDe, semaineReglee, finDuMois, gainsSemaine, bilans, etatTrophees, type Resultat } from "./trophees";

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

describe("semaines", () => {
  it("du lundi au dimanche", () => {
    expect(lundiDe("2026-11-28")).toBe("2026-11-23"); // samedi
    expect(lundiDe("2026-11-02")).toBe("2026-11-02"); // lundi
    expect(lundiDe("2026-11-01")).toBe("2026-10-26"); // dimanche
  });
  it("réglée quand le dernier quiz n'est plus rattrapable (dimanche + 3 jours)", () => {
    expect(semaineReglee("2026-11-16", "2026-11-25")).toBe(false);
    expect(semaineReglee("2026-11-16", "2026-11-26")).toBe(true);
  });
  it("fin du mois", () => {
    expect(finDuMois("2026-11-28")).toBe("2026-11-30");
    expect(finDuMois("2028-02-03")).toBe("2028-02-29");
  });
});

describe("trophées de la semaine (D36, docs/04 §8)", () => {
  const s = (semaine: string, userId: string, gemmes: number, solo = 0, manques = 0) => ({ semaine, userId, gemmes, solo, manques });
  const total = (b: ReturnType<typeof bilans>[number], u: string) => b.joueurs.find((j) => j.userId === u)!.total;

  it("exemple du doc : le 1er gagne 20, chaque quiz manqué coûte 10, jamais sous 0", () => {
    // semaine 1 : A 120 gemmes ; B 80 + 15 solo ; C ne joue pas et manque 2 quiz
    // semaine 2 : A 70 ; B 60 + 15 solo = 75 ; C 75 → B et C ex æquo, +20 chacun
    const b = bilans([s("2026-11-02", "A", 120), s("2026-11-02", "B", 80, 15), s("2026-11-02", "C", 0, 0, 2),
      s("2026-11-09", "A", 70), s("2026-11-09", "B", 60, 15), s("2026-11-09", "C", 75)], ["A", "B", "C"], "2026-11-28");
    expect(b[0].joueurs.map((j) => [j.rang, j.gain, j.perte, j.total])).toEqual([[1, 20, 0, 20], [2, 0, 0, 0], [null, 0, 20, 0]]);
    expect(b[1].joueurs.map((j) => [j.rang, j.gain, j.total])).toEqual([[3, 0, 20], [1, 20, 20], [1, 20, 20]]);
  });

  it("personne n'a marqué : aucun gain", () => {
    expect([...gainsSemaine([{ userId: "A", score: 0 }, { userId: "B", score: 0 }]).values()]).toEqual([{ rang: null, gain: 0 }, { rang: null, gain: 0 }]);
  });

  it("le solo seul peut gagner une semaine où personne d'autre n'a joué", () => {
    const [w] = bilans([s("2026-11-02", "A", 0, 15)], ["A", "B"], "2026-11-28");
    expect(w.joueurs[0]).toMatchObject({ rang: 1, gain: 20, total: 20 });
  });

  it("le solo n'efface pas la pénalité des quiz manqués", () => {
    const [w] = bilans([s("2026-11-02", "A", 0, 15, 1), s("2026-11-02", "B", 40)], ["A", "B"], "2026-11-28");
    expect(w.joueurs[0]).toMatchObject({ gain: 0, perte: 10, total: 0 });
  });

  it("le plancher à 0 s'applique semaine après semaine", () => {
    const b = bilans([s("2026-11-02", "A", 0, 0, 3), s("2026-11-09", "A", 50)], ["A"], "2026-11-28");
    expect(b.map((w) => total(w, "A"))).toEqual([0, 20]);
  });

  it("joueur absent d'une semaine (arrivé plus tard) : rien ne change", () => {
    const b = bilans([s("2026-11-02", "A", 30), s("2026-11-09", "B", 30)], ["A", "B"], "2026-11-28");
    expect(b.map((w) => [total(w, "A"), total(w, "B")])).toEqual([[20, 0], [20, 20]]);
  });

  it("la semaine en cours reste provisoire", () => {
    const b = bilans([s("2026-11-16", "A", 30), s("2026-11-23", "A", 30)], ["A"], "2026-11-28");
    expect(b.map((w) => w.reglee)).toEqual([true, false]);
    expect(etatTrophees(b, "A", "2026-11-28")).toEqual({ fige: 0, courant: 20, projection: 40 });
  });
});

describe("ligue du mois (D36)", () => {
  const gagne = (semaine: string) => ({ semaine, userId: "A", gemmes: 50, solo: 0, manques: 0 });
  // 5 semaines gagnées jusqu'en octobre (100 trophées : Argent), puis 2 quiz manqués début novembre (80)
  const scores = ["2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"].map(gagne)
    .concat({ semaine: "2026-11-02", userId: "A", gemmes: 0, solo: 0, manques: 2 });

  it("la ligue de novembre est fixée par le total de fin octobre", () => {
    const e = etatTrophees(bilans(scores, ["A"], "2026-11-20"), "A", "2026-11-20");
    expect(e).toEqual({ fige: 100, courant: 80, projection: 80 });
    expect(ligueDe(e.fige).ligue.nom).toBe("Argent");
  });

  it("descente au mois suivant", () => {
    const e = etatTrophees(bilans(scores, ["A"], "2026-12-10"), "A", "2026-12-10");
    expect(e.fige).toBe(80);
    expect(ligueDe(e.fige).ligue.nom).toBe("Bronze");
  });

  it("une semaine compte pour le mois de son dimanche", () => {
    // semaine du 26 octobre au 1er novembre : comptée en novembre, donc pas dans la ligue de novembre
    const e = etatTrophees(bilans([gagne("2026-10-26")], ["A"], "2026-11-20"), "A", "2026-11-20");
    expect(e).toEqual({ fige: 0, courant: 20, projection: 20 });
  });
});
