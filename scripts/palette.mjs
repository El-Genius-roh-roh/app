// Système de couleurs Révis'Arena : couleurs sources -> nuances OKLCH 50..950 -> jetons sémantiques
// (clair + sombre) -> contrôle des contrastes WCAG 2.1. Lancer : node scripts/palette.mjs [--css]
const SOURCES = {
  neutre: { h: 255, c: 0.018 },  // gris encre, légèrement bleuté
  bleu:   { h: 262, c: 0.20 },   // action principale (cobalt)
  braise: { h: 42,  c: 0.19 },   // énergie : série, flamme, arène
  or:     { h: 84,  c: 0.16 },   // classements, trophées
  vert:   { h: 152, c: 0.16 },   // bonne réponse
  rouge:  { h: 24,  c: 0.20 },   // mauvaise réponse, danger
};
const PAS = { 50: 0.975, 100: 0.945, 200: 0.89, 300: 0.81, 400: 0.71, 500: 0.62, 600: 0.535, 700: 0.46, 800: 0.385, 900: 0.31, 950: 0.225 };

// --- OKLCH -> sRGB (avec réduction de chroma pour rester dans le gamut) ---
function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return lin.map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
}
const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
function couleur(L, C, H) {
  let c = C, rgb = oklchToRgb(L, c, H);
  while (!inGamut(rgb) && c > 0) { c -= 0.002; rgb = oklchToRgb(L, c, H); }
  return "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
}
// chroma réduite aux extrémités pour des nuances douces
const echelles = Object.fromEntries(Object.entries(SOURCES).map(([nom, { h, c }]) => [nom, Object.fromEntries(Object.entries(PAS).map(([k, L]) => {
  const f = k <= 100 ? 0.35 : k >= 900 ? 0.6 : 1;
  return [k, couleur(L, c * f, h)];
}))]));

// --- jetons sémantiques ---
const E = echelles;
const THEMES = {
  clair: {
    fond: E.neutre[50], surface: "#ffffff", "surface-2": E.neutre[100], ligne: E.neutre[200], "ligne-forte": E.neutre[300],
    texte: E.neutre[950], "texte-2": E.neutre[700], "texte-3": E.neutre[600],
    accent: E.bleu[600], "accent-fort": E.bleu[700], "accent-ombre": E.bleu[800], "accent-doux": E.bleu[50], "sur-accent": "#ffffff",
    energie: E.braise[600], "energie-doux": E.braise[50], or: E.or[700], "or-vif": E.or[400], "or-doux": E.or[50],
    ok: E.vert[700], "ok-doux": E.vert[50], ko: E.rouge[600], "ko-doux": E.rouge[50],
  },
  sombre: {
    fond: E.neutre[950], surface: E.neutre[900], "surface-2": E.neutre[800], ligne: E.neutre[800], "ligne-forte": E.neutre[700],
    texte: E.neutre[50], "texte-2": E.neutre[300], "texte-3": E.neutre[400],
    accent: E.bleu[400], "accent-fort": E.bleu[300], "accent-ombre": E.bleu[700], "accent-doux": E.bleu[950], "sur-accent": E.neutre[950],
    energie: E.braise[400], "energie-doux": E.braise[950], or: E.or[400], "or-vif": E.or[400], "or-doux": E.or[950],
    ok: E.vert[400], "ok-doux": E.vert[950], ko: E.rouge[400], "ko-doux": E.rouge[950],
  },
};

// --- contraste WCAG ---
const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const PAIRES = [
  ["texte", "fond", 4.5], ["texte", "surface", 4.5], ["texte-2", "surface", 4.5], ["texte-3", "surface", 4.5], ["texte-3", "fond", 4.5], ["texte-2", "surface-2", 4.5],
  ["sur-accent", "accent", 4.5], ["accent-fort", "surface", 4.5], ["accent", "surface", 3], ["accent-fort", "accent-doux", 4.5],
  ["ok", "surface", 4.5], ["ok", "ok-doux", 4.5], ["ko", "surface", 4.5], ["ko", "ko-doux", 4.5],
  ["or", "surface", 4.5], ["or", "or-doux", 4.5], ["energie", "surface", 3], ["energie", "energie-doux", 3], ["ligne-forte", "surface", 1.4],
];

if (process.argv.includes("--css")) {
  for (const [t, v] of Object.entries(THEMES)) { console.log(`/* ${t} */`); for (const [k, x] of Object.entries(v)) console.log(`  --color-${k}: ${x};`); }
} else {
  console.log("Nuances :"); for (const [n, s] of Object.entries(echelles)) console.log(n.padEnd(7), Object.values(s).join(" "));
  let ko = 0;
  for (const [t, v] of Object.entries(THEMES)) {
    console.log(`\nContrastes — thème ${t}`);
    for (const [a, b, min] of PAIRES) { const r = ratio(v[a], v[b]); const okp = r >= min; if (!okp) ko++; console.log(`${okp ? "OK " : "KO "} ${a.padEnd(12)} sur ${b.padEnd(12)} ${r.toFixed(2).padStart(5)}:1 (min ${min})`); }
  }
  console.log(`\n${ko} paire(s) sous le seuil`); process.exitCode = ko ? 1 : 0;
}
