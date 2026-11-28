import fs from "fs";
import path from "path";

/** Retire les caractères de contrôle (dont \u0000, refusé par Postgres) que certains PDF glissent dans leur texte. */
export const cleanText = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFD]/g, "").replace(/[ \t]+/g, " ");

// Accents détachés des PDF LaTeX : « R´ egression », « ` a », « ˆ etre » → lettre accentuée
const ACCENTS: Record<string, string> = { "´": "\u0301", "`": "\u0300", "ˆ": "\u0302", "¨": "\u0308", "¸": "\u0327", "˜": "\u0303" };
export const fixAccents = (s: string) =>
  s.replace(/([´`ˆ¨¸˜]) ?([A-Za-zıȷ])/g, (_, a: string, l: string) => (l === "ı" ? "i" : l === "ȷ" ? "j" : l) + ACCENTS[a])
    .normalize("NFC");

// Polices standard de pdfjs (sinon avertissements et rendu d'image dégradé pour certains PDF)
// pdfjs exige une barre « / » finale, même sous Windows (path.sep y vaut « \ » et faisait échouer tout import de PDF)
const FONTS = path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts").replace(/\\/g, "/") + "/";

export type ExtractedPage = { numero: number; texte: string; imagePath: string | null };

/** Extrait le texte de chaque page et rend une image PNG (au mieux : l'image est facultative). */
export async function extractPdf(file: string, imageDir: string): Promise<ExtractedPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false, standardFontDataUrl: FONTS }).promise;
  fs.mkdirSync(imageDir, { recursive: true });
  let createCanvas: ((w: number, h: number) => any) | null = null;
  try { createCanvas = (await import("@napi-rs/canvas")).createCanvas; } catch { /* pas d'images */ }

  const pages: ExtractedPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    // reconstitue les lignes à partir de la position verticale
    const lines = new Map<number, { x: number; s: string }[]>();
    for (const it of content.items as any[]) {
      const str = "str" in it ? cleanText(it.str) : "";
      if (!str.trim()) continue;
      const y = Math.round(it.transform[5] / 4);
      (lines.get(y) ?? lines.set(y, []).get(y)!).push({ x: it.transform[4], s: str });
    }
    let texte = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, v]) => v.sort((a, b) => a.x - b.x).map((i) => i.s).join(" "))
      .join("\n");
    texte = fixAccents(texte);

    let imagePath: string | null = null;
    if (createCanvas) {
      try {
        const vp = page.getViewport({ scale: 1.2 });
        const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp, canvas } as any).promise;
        imagePath = path.join(imageDir, `${n}.png`);
        fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));
      } catch { imagePath = null; }
    }
    pages.push({ numero: n, texte, imagePath });
    page.cleanup(); // libère la mémoire page par page (gros PDF)
  }
  return pages;
}
