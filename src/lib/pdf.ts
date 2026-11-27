import fs from "fs";
import path from "path";

export type ExtractedPage = { numero: number; texte: string; imagePath: string | null };

/** Extrait le texte de chaque page et rend une image PNG (au mieux : l'image est facultative). */
export async function extractPdf(file: string, imageDir: string): Promise<ExtractedPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
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
      if (!("str" in it) || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 4);
      (lines.get(y) ?? lines.set(y, []).get(y)!).push({ x: it.transform[4], s: it.str });
    }
    const texte = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, v]) => v.sort((a, b) => a.x - b.x).map((i) => i.s).join(" "))
      .join("\n");

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
  }
  return pages;
}
