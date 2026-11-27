import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";

const chapitres: { titre: string; slides: { t: string; l: string[] }[] }[] = [
  { titre: "La cellule", slides: [
    { t: "Définition de la cellule", l: ["Unité structurale et fonctionnelle du vivant.", "Théorie cellulaire : toute cellule provient d'une cellule préexistante.", "Taille typique : 1 à 100 micromètres."] },
    { t: "Procaryotes et eucaryotes", l: ["Procaryote : pas de noyau, ADN dans le nucléoïde.", "Eucaryote : noyau délimité par une enveloppe nucléaire.", "Les mitochondries n'existent que chez les eucaryotes."] },
    { t: "La membrane plasmique", l: ["Bicouche de phospholipides.", "Les protéines transmembranaires assurent le transport.", "Le cholestérol régule la fluidité membranaire."] },
    { t: "Le noyau", l: ["Contient l'ADN chromosomique.", "Le nucléole produit les sous-unités des ribosomes.", "Les pores nucléaires contrôlent les échanges."] },
  ]},
  { titre: "Le métabolisme énergétique", slides: [
    { t: "L'ATP", l: ["L'ATP est la monnaie énergétique de la cellule.", "L'hydrolyse de l'ATP libère environ 30,5 kJ/mol.", "ATP synthase : enzyme de la membrane interne mitochondriale."] },
    { t: "La glycolyse", l: ["Se déroule dans le cytosol.", "Une molécule de glucose donne 2 pyruvates.", "Bilan net : 2 ATP et 2 NADH."] },
    { t: "Le cycle de Krebs", l: ["Se déroule dans la matrice mitochondriale.", "Produit NADH, FADH2 et du CO2.", "L'acétyl-CoA entre dans le cycle en se combinant à l'oxaloacétate."] },
    { t: "La chaîne respiratoire", l: ["Située dans la membrane interne des mitochondries.", "L'accepteur final d'électrons est l'oxygène.", "Le gradient de protons alimente l'ATP synthase."] },
    { t: "La fermentation", l: ["Elle a lieu sans oxygène.", "La fermentation lactique régénère le NAD+.", "Rendement faible : 2 ATP par glucose."] },
  ]},
  { titre: "La division cellulaire", slides: [
    { t: "Le cycle cellulaire", l: ["Phases : G1, S, G2 puis M.", "La réplication de l'ADN a lieu en phase S.", "Les points de contrôle empêchent les divisions anormales."] },
    { t: "La mitose", l: ["Prophase, métaphase, anaphase, télophase.", "Les chromatides sœurs se séparent en anaphase.", "Produit deux cellules filles identiques."] },
    { t: "La méiose", l: ["Deux divisions successives.", "Produit quatre cellules haploïdes.", "Le crossing-over a lieu en prophase I."] },
    { t: "Cancer et prolifération", l: ["Perte du contrôle du cycle cellulaire.", "p53 est un gène suppresseur de tumeur.", "Les oncogènes stimulent la division."] },
  ]},
  { titre: "Génétique moléculaire", slides: [
    { t: "Structure de l'ADN", l: ["Double hélice antiparallèle.", "A s'apparie avec T, G avec C.", "Le squelette est composé de désoxyribose et de phosphate."] },
    { t: "La réplication", l: ["Semi-conservative.", "L'ADN polymérase synthétise de 5' vers 3'.", "Le brin tardif est synthétisé en fragments d'Okazaki."] },
    { t: "La transcription", l: ["L'ARN polymérase synthétise l'ARN messager.", "Chez les eucaryotes, l'épissage retire les introns.", "Le promoteur est le site de fixation de l'ARN polymérase."] },
    { t: "La traduction", l: ["Se déroule sur les ribosomes.", "Chaque codon de trois nucléotides code un acide aminé.", "Le codon AUG est le codon d'initiation."] },
  ]},
];

async function make(path: string, withTitle: boolean, slidesOf: (typeof chapitres)) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const add = (title: string, lines: string[], sub?: string) => {
    const p = pdf.addPage([800, 450]);
    if (sub) p.drawText(sub, { x: 40, y: 410, size: 12, font, color: rgb(0.4, 0.4, 0.4) });
    p.drawText(title, { x: 40, y: 370, size: 28, font: bold, color: rgb(0.1, 0.1, 0.5) });
    lines.forEach((l, i) => p.drawText("- " + l, { x: 50, y: 310 - i * 40, size: 18, font }));
  };
  if (withTitle) {
    add("Biologie cellulaire", ["Licence 2 - Semestre 3"]);
    add("Sommaire", slidesOf.map((c, i) => `${i + 1}. ${c.titre}`));
  }
  for (const c of slidesOf) {
    if (withTitle) add(c.titre, []);
    for (const s of c.slides) add(s.t, s.l, c.titre);
  }
  if (withTitle) add("Merci de votre attention", []);
  fs.writeFileSync(path, await pdf.save());
}

(async () => {
  await make("storage/demo-cours.pdf", true, chapitres);
  // Annale : questions types
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const p = pdf.addPage([595, 842]);
  const qs = ["Annale 2025 - Biologie cellulaire", "1. Définir la glycolyse et donner son bilan net en ATP.", "2. Vrai ou faux : l'anaphase sépare les chromatides sœurs.",
    "3. Citer deux différences entre procaryote et eucaryote.", "4. Expliquer le rôle de l'ATP synthase.", "5. Quel brin de l'ADN est synthétisé en fragments d'Okazaki ?"];
  qs.forEach((l, i) => p.drawText(l, { x: 50, y: 780 - i * 30, size: 13, font }));
  fs.writeFileSync("storage/demo-annale.pdf", await pdf.save());
  console.log("ok");
})();
