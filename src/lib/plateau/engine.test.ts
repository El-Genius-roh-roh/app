import { describe, expect, it } from "vitest";
import { PLATEAU } from "@/config/constants";
import { rng } from "../rng";
import type { PoolQuestion } from "../arena/engine";
import { actionLancer, actionRepondre, advance, construirePlateau, joueur, newState, startGame, viewFor, type State } from "./engine";

const themes = [{ id: "bio", nom: "Biologie" }, { id: "proba", nom: "Probabilités" }, { id: "ml", nom: "Machine Learning" }];
const pools: Record<string, PoolQuestion[]> = Object.fromEntries(themes.map((t) => [t.id, Array.from({ length: 4 }, (_, i) => ({
  id: `${t.id}${i}`, type: "qcm" as const, enonce: `${t.nom} ${i}`, choix: ["A", "B", "C", "D"], correct_index: 1, explication: "",
}))]));

/** Alice (humaine, hôte) + Bob (humain) ; bots optionnels. */
function partie(bots = 0): State {
  const s = newState("PLAT", "g1", { id: "a", name: "Alice" });
  s.joueurs.push(joueur("b", "Bob", false, 0));
  for (let i = 0; i < bots; i++) s.joueurs.push(joueur(`bot:${i}`, `Bot${i}`, true, 0.7));
  startGame(s, themes, pools, 0, rng(7));
  return s;
}

describe("plateau", () => {
  it("chaque case 1..N a un thème, départ sans thème, thèmes équilibrés", () => {
    const c = construirePlateau(themes, PLATEAU.CASES, rng(1));
    expect(c).toHaveLength(PLATEAU.CASES + 1);
    expect(c[0]).toBe("");
    for (const t of themes) expect(c.filter((x) => x === t.id)).toHaveLength(PLATEAU.CASES / 3);
  });
  it("jamais deux cases voisines du même thème (dès 2 thèmes)", () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const th of [themes, themes.slice(0, 2)]) {
        const c = construirePlateau(th, PLATEAU.CASES, rng(seed)).slice(1);
        for (let i = 1; i < c.length; i++) expect(c[i]).not.toBe(c[i - 1]);
      }
    }
  });
  it("avec un seul thème, toutes les cases l'ont", () => {
    expect(new Set(construirePlateau([themes[0]], 10, rng(2)).slice(1))).toEqual(new Set(["bio"]));
  });
});

describe("tour de jeu", () => {
  it("lancer → question du thème de la case visée ; juste : avance sur la case", () => {
    const s = partie();
    expect(actionLancer(s, "a", 100, rng(3)).ok).toBe(true);
    expect(s.phase).toBe("question");
    expect(s.cible).toBe(s.de);
    expect(s.question!.theme).toBe(s.cases[s.cible!]);
    expect(actionRepondre(s, "a", s.question!.key, 200).ok).toBe(true);
    expect(s.joueurs[0].pos).toBe(s.de);
    expect(s.phase).toBe("resultat");
  });
  it("faux : reste sur place ; puis c'est au tour du suivant", () => {
    const s = partie();
    actionLancer(s, "a", 100, rng(3));
    actionRepondre(s, "a", (s.question!.key + 1) % 4, 200);
    expect(s.joueurs[0].pos).toBe(0);
    advance(s, 200 + PLATEAU.RESULTAT_S * 1000, rng(4));
    expect(s.phase).toBe("lancer");
    expect(s.joueurs[s.tour].id).toBe("b");
  });
  it("seul le joueur actif peut lancer ou répondre", () => {
    const s = partie();
    expect(actionLancer(s, "b", 100, rng(3)).ok).toBe(false);
    actionLancer(s, "a", 100, rng(3));
    expect(actionRepondre(s, "b", s.question!.key, 150).ok).toBe(false);
  });
  it("délais : dé lancé automatiquement, puis pas de réponse = faux", () => {
    const s = partie();
    advance(s, PLATEAU.LANCER_S * 1000, rng(5));
    expect(s.phase).toBe("question");
    advance(s, (PLATEAU.LANCER_S + PLATEAU.REPONSE_S) * 1000, rng(5));
    expect(s.phase).toBe("resultat");
    expect(s.reponse).toMatchObject({ choice: null, ok: false });
    expect(s.joueurs[0].pos).toBe(0);
  });
  it("on ne dépasse pas l'arrivée ; atteindre l'arrivée termine la partie", () => {
    const s = partie();
    s.joueurs[0].pos = PLATEAU.CASES - 1;
    actionLancer(s, "a", 100, rng(3));
    expect(s.cible).toBe(PLATEAU.CASES);
    actionRepondre(s, "a", s.question!.key, 200);
    expect(s.gagnant).toBe("a");
    advance(s, 200 + PLATEAU.RESULTAT_S * 1000, rng(4));
    expect(s.phase).toBe("final");
    expect(viewFor(s, "a", 0).classement![0]).toBe("a");
  });
  it("un joueur parti est sauté", () => {
    const s = partie();
    s.joueurs[1].left = true;
    actionLancer(s, "a", 100, rng(3));
    actionRepondre(s, "a", 0, 200);
    advance(s, 200 + PLATEAU.RESULTAT_S * 1000, rng(4));
    expect(s.joueurs[s.tour].id).toBe("a");
  });
  it("rattrape plusieurs tours de bots d'un seul advance, jusqu'à la fin", () => {
    const s = newState("BOTS", "g1", { id: "a", name: "Alice" });
    s.joueurs[0].left = true; // l'humain est parti : les bots jouent seuls
    s.joueurs.push(joueur("bot:1", "B1", true, 0.9), joueur("bot:2", "B2", true, 0.9));
    startGame(s, themes, pools, 0, rng(9));
    advance(s, 10_000_000, rng(10));
    expect(s.phase).toBe("final");
    expect(s.gagnant).toMatch(/^bot:/);
    expect(s.joueurs.find((j) => j.id === s.gagnant)!.pos).toBe(PLATEAU.CASES);
  });
  it("la vue ne révèle pas la bonne réponse pendant la question", () => {
    const s = partie();
    actionLancer(s, "a", 100, rng(3));
    const v = viewFor(s, "b", 150);
    expect(v.question!.key).toBeUndefined();
    expect(JSON.stringify(v)).not.toContain("banque");
  });
});
