import katex from "katex";

/**
 * Affiche un texte qui peut contenir des formules LaTeX :
 * $…$ ou \(…\) en ligne, $$…$$ ou \[…\] centrées. « \$ » donne un dollar littéral.
 */
const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<!\\)\$((?:\\\$|[^$])+?)\$/g;

function render(tex: string, display: boolean): string {
  // toujours en mode « en ligne » : KaTeX peut alors couper les longues formules (après =, +, …) au lieu de déborder ;
  // les $$…$$ sont simplement centrés sur leur propre ligne (classe tex-bloc).
  void display;
  return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false, strict: false, output: "html" });
}

export type Part = { math: false; text: string } | { math: true; html: string; display: boolean };

export function texParts(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(MATH)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ math: false, text: text.slice(last, i) });
    const display = m[1] !== undefined || m[2] !== undefined;
    parts.push({ math: true, display, html: render(m[1] ?? m[2] ?? m[3] ?? m[4], display) });
    last = i + m[0].length;
  }
  if (last < text.length) parts.push({ math: false, text: text.slice(last) });
  return parts.map((p) => (p.math ? p : { ...p, text: p.text.replace(/\\\$/g, "$") }));
}
