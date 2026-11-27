// IA SIMULÉE (aucune clé API) : heuristiques déterministes qui reproduisent le contrat de docs/03.
export type PageAnalysis = {
  type: "titre" | "sommaire" | "contenu" | "exercice" | "vide";
  chapitre: string | null;
  densite: number;
  notions: string[];
};

const lines = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);

export function mockAnalyzePages(texts: string[]): PageAnalysis[] {
  const first = texts.map((t) => lines(t)[0] ?? "");
  let chapitre: string | null = null;
  return texts.map((t, i) => {
    const L = lines(t);
    const joined = t.toLowerCase();
    const bullets = L.filter((l) => l.startsWith("- ")).length;
    let type: PageAnalysis["type"] = "contenu";
    if (L.length === 0 || /merci|remerciements|fin\b/.test(joined) && L.length <= 2) type = "vide";
    else if (/^(sommaire|plan|table des mati)/i.test(L[0])) type = "sommaire";
    else if (L.length <= 2 && bullets === 0) type = "titre";
    else if (/exercice|application num/i.test(L[0] + (L[1] ?? ""))) type = "exercice";

    // un en-tête répété sur des pages voisines = nom du chapitre ; une page de titre ouvre un chapitre
    const repeated = first[i] && (first[i] === first[i - 1] || first[i] === first[i + 1]);
    if (type === "titre") chapitre = L[0];
    else if (type === "contenu" && repeated && L.length >= 3) chapitre = first[i];

    const chars = t.replace(/\s+/g, " ").length;
    const densite = type === "contenu" || type === "exercice"
      ? chars < 120 ? 1 : chars < 300 ? 2 : chars < 550 ? 3 : chars < 850 ? 4 : 5
      : 0;
    const titre = repeated && L.length >= 3 ? L[1] : L[0];
    return { type, chapitre, densite, notions: densite > 0 && titre ? [titre.replace(/^- /, "").slice(0, 80)] : [] };
  });
}
