import { describe, expect, it } from "vitest";
import { ARENA, COURSE } from "@/config/constants";
import { rng } from "../rng";
import {
  advance, buildRounds, eloChanges, newState, pointsFor, ranking, startGame, submitAnswer, tierOf, viewFor,
  type PoolQuestion, type State,
} from "./engine";

const pool: PoolQuestion[] = Array.from({ length: 12 }, (_, i) => ({
  id: `q${i}`, type: i % 4 === 3 ? "vrai_faux" : "qcm", enonce: `Question ${i}`,
  choix: i % 4 === 3 ? ["Vrai", "Faux"] : ["A", "B", "C", "D"], correct_index: i % 4 === 3 ? 0 : 1, explication: `Expl ${i}`,
}));

function game(mode: "blitz" | "vf" | "mix" | "course" = "blitz", n = 3): State {
  const s = newState("ABCD", "g1", { id: "u1", name: "Alice" }, mode, n);
  s.players.push({ id: "u2", name: "Bob", bot: false, skill: 0, score: 0, streak: 0, left: false, answers: {} });
  startGame(s, buildRounds(pool, mode, n, rng(42)), 0);
  return s;
}

describe("buildRounds", () => {
  it("blitz : uniquement des QCM, choix mélangés mais bonne réponse conservée", () => {
    const r = buildRounds(pool, "blitz", 5, rng(1));
    expect(r).toHaveLength(5);
    for (const x of r) { expect(x.kind).toBe("qcm"); expect(x.choices[x.key]).toBe("B"); }
  });
  it("vf : uniquement Vrai/Faux, y compris des QCM transformés", () => {
    const r = buildRounds(pool, "vf", 10, rng(2));
    expect(r).toHaveLength(10);
    expect(r.every((x) => x.kind === "vf" && x.choices.join() === "Vrai,Faux")).toBe(true);
  });
  it("mix : mélange les deux types sans doublon", () => {
    const r = buildRounds(pool, "mix", 9, rng(3));
    expect(new Set(r.map((x) => x.qid)).size).toBe(r.length);
    expect(r.some((x) => x.kind === "vf")).toBe(true);
    expect(r.some((x) => x.kind === "qcm")).toBe(true);
  });
});

describe("points", () => {
  it("réponse instantanée = 1000, au gong = 500", () => {
    expect(pointsFor(15000, 15000, 1).pts).toBe(1000);
    expect(pointsFor(0, 15000, 1).pts).toBe(500);
    expect(pointsFor(7500, 15000, 1).pts).toBe(750);
  });
  it("bonus de série plafonné", () => {
    expect(pointsFor(0, 1000, 2).bonus).toBe(ARENA.BONUS_SERIE);
    expect(pointsFor(0, 1000, 99).bonus).toBe(ARENA.BONUS_SERIE * ARENA.BONUS_SERIE_MAX);
  });
});

describe("partie", () => {
  it("ne divulgue jamais la bonne réponse pendant la question", () => {
    const s = game();
    const v = viewFor(s, "u1", 100);
    expect(v.round?.key).toBeUndefined();
    expect(v.round?.explication).toBeUndefined();
    expect(JSON.stringify(v)).not.toContain('"key":');
  });

  it("une seule réponse par manche, choix validé, refus après le gong", () => {
    const s = game();
    expect(submitAnswer(s, "u1", 0, 99, 100).ok).toBe(false);
    expect(submitAnswer(s, "u1", 1, 0, 100).ok).toBe(false);
    expect(submitAnswer(s, "u1", 0, 0, 100).ok).toBe(true);
    expect(submitAnswer(s, "u1", 0, 1, 200).ok).toBe(false);
    expect(submitAnswer(s, "u2", 0, 0, s.deadline + ARENA.TOLERANCE_MS + 1).ok).toBe(false);
  });

  it("la manche se ferme dès que tout le monde a répondu, puis enchaîne après la correction", () => {
    const s = game();
    const key = s.rounds[0].key;
    submitAnswer(s, "u1", 0, key, 1000);
    expect(advance(s, 1500)).toBe(false);
    submitAnswer(s, "u2", 0, (key + 1) % 4, 3000);
    advance(s, 3100);
    expect(s.phase).toBe("reveal");
    expect(s.players[0].score).toBe(pointsFor(14000, 15000, 1).pts);
    expect(s.players[1].score).toBe(0);
    const v = viewFor(s, "u2", 3100);
    expect(v.round?.key).toBe(key);
    advance(s, 3000 + ARENA.REVEAL_S * 1000);
    expect(s.phase).toBe("question");
    expect(s.idx).toBe(1);
  });

  it("rattrape plusieurs manches d'un coup si personne n'a interrogé le serveur", () => {
    const s = game("blitz", 3);
    advance(s, 10 * 60_000);
    expect(s.phase).toBe("final");
    expect(s.players.every((p) => Object.values(p.answers).every((a) => a.missed))).toBe(true);
  });

  it("les bots répondent de façon déterministe avant la fin du temps", () => {
    const s = game();
    s.players.push({ id: "bot:Gauss", name: "Gauss 🤖", bot: true, skill: 1, score: 0, streak: 0, left: false, answers: {} });
    advance(s, s.deadline);
    const a = s.players[2].answers[0];
    expect(a.ok).toBe(true);
    expect(a.at).toBeLessThan(s.deadline);
  });

  it("un joueur parti n'est pas attendu", () => {
    const s = game();
    s.players[1].left = true;
    submitAnswer(s, "u1", 0, 0, 500);
    advance(s, 600);
    expect(s.phase).toBe("reveal");
  });
});

describe("Elo et ligues", () => {
  it("à niveau égal, le vainqueur gagne ce que le perdant perd", () => {
    const d = eloChanges([{ id: "a", score: 3000, rating: 1000 }, { id: "b", score: 1000, rating: 1000 }]);
    expect(d.a).toBe(16);
    expect(d.b).toBe(-16);
  });
  it("égalité de score = 0 à niveau égal ; seul = 0", () => {
    expect(eloChanges([{ id: "a", score: 5, rating: 1000 }, { id: "b", score: 5, rating: 1000 }]).a).toBe(0);
    expect(eloChanges([{ id: "a", score: 5, rating: 1000 }]).a).toBe(0);
  });
  it("battre un plus fort rapporte plus", () => {
    const d = eloChanges([{ id: "a", score: 2, rating: 900 }, { id: "b", score: 1, rating: 1300 }]);
    expect(d.a).toBeGreaterThan(16);
  });
  it("ligues", () => {
    expect(tierOf(900)).toBe("Bronze");
    expect(tierOf(1000)).toBe("Argent");
    expect(tierOf(1450)).toBe("Diamant");
  });
});

describe("mode Course", () => {
  // manche 0 : Alice bonne et la plus rapide (turbo), Bob faux ; manche 1 : Alice sans réponse, Bob bon
  it("bonne réponse : avance (+ turbo pour la plus rapide), erreur : recule, pas de réponse : reste", () => {
    const s = game("course", 5);
    const key = s.rounds[0].key;
    expect(submitAnswer(s, "u1", 0, key, 1000).ok).toBe(true);
    expect(submitAnswer(s, "u2", 0, (key + 1) % 4, 2000).ok).toBe(true);
    advance(s, 2001);
    const [a, b] = s.players;
    expect(a.pos).toBe(COURSE.BONNE + COURSE.TURBO);
    expect(a.answers[0]).toMatchObject({ move: COURSE.BONNE + COURSE.TURBO, turbo: true });
    expect(b.pos).toBe(0); // pas de recul sous la case départ
    advance(s, 2001 + ARENA.REVEAL_S * 1000); // manche 1
    expect(s.idx).toBe(1);
    submitAnswer(s, "u2", 1, s.rounds[1].key, s.roundStart + 500);
    advance(s, s.deadline + 1);
    expect(a.pos).toBe(COURSE.BONNE + COURSE.TURBO); // temps écoulé : sur place
    expect(b.pos).toBe(COURSE.BONNE + COURSE.TURBO);
  });
  it("une erreur fait reculer une voiture déjà partie", () => {
    const s = game("course", 5);
    s.players[0].pos = 4;
    submitAnswer(s, "u1", 0, (s.rounds[0].key + 1) % 4, 1000);
    submitAnswer(s, "u2", 0, (s.rounds[0].key + 1) % 4, 1000);
    advance(s, 1001);
    expect(s.players[0].pos).toBe(4 - COURSE.ERREUR);
  });
  it("s'arrête dès qu'une voiture passe la ligne, classement par position", () => {
    const s = game("course", 5);
    s.players[1].pos = COURSE.ARRIVEE - 1;
    s.players[0].score = 99999;
    submitAnswer(s, "u2", 0, s.rounds[0].key, 1000);
    submitAnswer(s, "u1", 0, (s.rounds[0].key + 1) % 4, 1000);
    advance(s, 1001 + ARENA.REVEAL_S * 1000);
    expect(s.phase).toBe("final");
    expect(s.players[1].pos).toBe(COURSE.ARRIVEE);
    expect(ranking(s)[0].id).toBe("u2");
  });
});
