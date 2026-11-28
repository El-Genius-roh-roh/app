import { describe, expect, it } from "vitest";
import { DEFI } from "@/config/constants";
import { addDays } from "../clock";
import { rng } from "../rng";
import { formatDuJour, formatJouable, numeroDuJour, propositionVF, relierJuste, reserveRelier, vfJuste } from "./formats";

describe("format du défi du jour", () => {
  it("le même toute la journée, un autre le lendemain, et tous y passent", () => {
    const n = DEFI.FORMATS.length;
    const jours = Array.from({ length: n }, (_, i) => formatDuJour(addDays("2026-11-28", i)));
    expect(new Set(jours).size).toBe(n);
    expect(formatDuJour("2026-11-28")).toBe(formatDuJour("2026-11-28"));
    expect(formatDuJour(addDays("2026-11-28", n))).toBe(jours[0]);
  });
  it("numéro du jour continu au changement d'année", () => {
    expect(numeroDuJour("2027-01-01") - numeroDuJour("2026-12-31")).toBe(1);
  });
  it("Relier sans au moins deux QCM retombe sur le QCM", () => {
    expect([formatJouable("relier", 1), formatJouable("relier", 2), formatJouable("vf", 0)]).toEqual(["qcm", "relier", "vf"]);
  });
});

describe("Vrai ou faux", () => {
  it("propose la bonne réponse environ une fois sur deux, sinon un autre choix", () => {
    const r = rng(7);
    const props = Array.from({ length: 400 }, () => propositionVF(4, 2, r));
    const bonnes = props.filter((p) => p === 2).length;
    expect(bonnes).toBeGreaterThan(150);
    expect(bonnes).toBeLessThan(250);
    expect(props.every((p) => p >= 0 && p < 4)).toBe(true);
  });
  it("juste : « vrai » sur la bonne réponse, « faux » sur une autre", () => {
    expect([vfJuste(0, 2, 2), vfJuste(1, 2, 2), vfJuste(1, 0, 2), vfJuste(0, 0, 2)]).toEqual([true, false, true, false]);
  });
});

describe("Relier", () => {
  it("la réserve perd les réponses des questions déjà jouées, dans l'ordre tiré", () => {
    expect(reserveRelier(["c", "a", "b"], new Set(["a"]))).toEqual(["c", "b"]);
  });
  it("juste si le texte est le même (casse et espaces ignorés)", () => {
    expect([relierJuste("NP ", "np"), relierJuste("np(1-p)", "np")]).toEqual([true, false]);
  });
});
