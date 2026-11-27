// Données de démo pour l'Arène : un groupe « ENSAI Démo », 3 matières et des quiz « d'hier » déjà vérifiés,
// plus 3 comptes (Alice, Bob, Chloé). Idempotent. Usage : node --env-file=.env.local scripts/seed-arene.mjs
import pg from "pg";

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query("set search_path to revision_app");

const Q = (enonce, choix, correct, explication) => ({ type: "qcm", enonce, choix, correct, explication });
const VF = (enonce, vrai, explication) => ({ type: "vrai_faux", enonce, choix: ["Vrai", "Faux"], correct: vrai ? 0 : 1, explication });

const MATIERES = {
  "Probabilités": [
    Q("P(A ∪ B) est égal à…", ["P(A) + P(B) − P(A ∩ B)", "P(A) + P(B)", "P(A) × P(B)", "P(A) − P(B)"], 0, "On retire l'intersection, comptée deux fois."),
    Q("Espérance de X ~ B(n, p) ?", ["np", "np(1 − p)", "p/n", "n/p"], 0, "Somme de n Bernoulli d'espérance p."),
    Q("Variance d'une loi de Poisson P(λ) ?", ["λ", "λ²", "√λ", "1/λ"], 0, "Pour la loi de Poisson, espérance = variance = λ."),
    Q("Quelle loi continue est « sans mémoire » ?", ["Exponentielle", "Normale", "Uniforme", "Gamma(2, λ)"], 0, "P(X > s + t | X > s) = P(X > t)."),
    Q("A et B indépendants ⇔ …", ["P(A ∩ B) = P(A)P(B)", "P(A ∩ B) = 0", "P(A|B) = P(B)", "P(A ∪ B) = 1"], 0, "Définition de l'indépendance."),
    Q("Le TCL dit que la moyenne centrée réduite converge vers…", ["N(0, 1)", "une loi de Poisson", "0 presque sûrement", "une loi uniforme"], 0, "Convergence en loi vers la normale centrée réduite."),
    Q("Espérance d'un dé équilibré à 6 faces ?", ["3,5", "3", "4", "21"], 0, "(1+2+…+6)/6 = 21/6."),
    Q("Formule de Bayes : P(A|B) = …", ["P(B|A)P(A)/P(B)", "P(A)P(B)", "P(A ∩ B)/P(A)", "P(B|A)/P(A)"], 0, "On inverse le conditionnement."),
    Q("Espérance de l'exponentielle de paramètre λ ?", ["1/λ", "λ", "λ²", "1/λ²"], 0, "E[X] = 1/λ, Var(X) = 1/λ²."),
    VF("Deux événements incompatibles de probabilités non nulles sont indépendants.", false, "Incompatibles : P(A ∩ B) = 0 ≠ P(A)P(B)."),
    VF("Var(aX + b) = a² Var(X).", true, "Une constante additive ne change pas la dispersion."),
    VF("La loi des grands nombres porte sur la convergence de la moyenne empirique.", true, "Elle converge vers l'espérance."),
  ],
  "Statistique inférentielle": [
    Q("Un estimateur est sans biais si…", ["E[θ̂] = θ", "Var(θ̂) = 0", "θ̂ = θ", "θ̂ converge en loi"], 0, "Son espérance vaut le paramètre."),
    Q("Quantile à 97,5 % de N(0, 1) ?", ["1,96", "1,64", "2,58", "1,00"], 0, "Utilisé pour les IC bilatéraux à 95 %."),
    Q("La p-value est…", ["la proba sous H0 d'un résultat au moins aussi extrême", "la proba que H0 soit vraie", "la puissance du test", "le niveau α"], 0, "Elle se calcule sous H0."),
    Q("L'erreur de type I consiste à…", ["rejeter H0 alors qu'elle est vraie", "accepter H0 fausse", "se tromper de statistique", "choisir n trop petit"], 0, "Sa probabilité est contrôlée par α."),
    Q("Variance empirique sans biais : on divise par…", ["n − 1", "n", "n + 1", "√n"], 0, "Correction de Bessel."),
    Q("Test adapté à l'indépendance de deux variables qualitatives ?", ["χ² d'indépendance", "t de Student", "Shapiro-Wilk", "ANOVA"], 0, "On travaille sur un tableau de contingence."),
    Q("Si n est multiplié par 4, la largeur de l'IC est…", ["divisée par 2", "divisée par 4", "inchangée", "multipliée par 2"], 0, "Largeur proportionnelle à 1/√n."),
    Q("La puissance d'un test vaut…", ["1 − β", "α", "1 − α", "β"], 0, "Probabilité de rejeter H0 quand elle est fausse."),
    Q("Pour comparer plus de deux moyennes, on utilise…", ["l'ANOVA", "le χ²", "le test de Shapiro", "la corrélation"], 0, "Analyse de la variance."),
    VF("Une p-value de 0,03 signifie que H0 a 3 % de chances d'être vraie.", false, "C'est une probabilité calculée sous H0, pas la probabilité de H0."),
    VF("Le coefficient de corrélation de Pearson est compris entre −1 et 1.", true, "Par l'inégalité de Cauchy-Schwarz."),
  ],
  "Machine Learning": [
    Q("Le surapprentissage, c'est…", ["bon sur le train, mauvais sur le test", "mauvais partout", "bon partout", "un modèle trop simple"], 0, "Le modèle apprend le bruit."),
    Q("La régularisation L1 (Lasso)…", ["met des coefficients exactement à zéro", "n'a aucun effet", "augmente la variance", "remplace la validation croisée"], 0, "Elle fait de la sélection de variables."),
    Q("La validation croisée sert à…", ["estimer l'erreur de généralisation", "accélérer l'entraînement", "nettoyer les données", "augmenter le jeu de données"], 0, "On évalue sur des plis non vus."),
    Q("k-means est un algorithme…", ["non supervisé (clustering)", "de régression", "de classification supervisée", "de réduction de dimension"], 0, "Il regroupe sans étiquettes."),
    Q("Précision = …", ["TP / (TP + FP)", "TP / (TP + FN)", "(TP + TN) / total", "FP / (FP + TN)"], 0, "Parmi les prédits positifs, la part de vrais positifs."),
    Q("Rappel = …", ["TP / (TP + FN)", "TP / (TP + FP)", "TN / (TN + FP)", "(TP + TN) / total"], 0, "Parmi les vrais positifs, la part retrouvée."),
    Q("Un pas d'apprentissage trop grand en descente de gradient…", ["peut faire diverger", "garantit la convergence", "n'a pas d'effet", "réduit le biais"], 0, "On saute par-dessus le minimum."),
    Q("Un modèle trop simple a…", ["un biais élevé", "une variance élevée", "un surapprentissage", "une erreur nulle"], 0, "Il sous-apprend."),
    Q("Une forêt aléatoire est…", ["un ensemble d'arbres (bagging)", "un seul arbre profond", "un réseau de neurones", "une ACP"], 0, "Moyenne d'arbres sur des échantillons bootstrap."),
    Q("L'ACP sert à…", ["réduire la dimension", "classer", "imputer les valeurs manquantes", "équilibrer les classes"], 0, "Projection sur les axes de variance maximale."),
    VF("On peut régler les hyperparamètres sur le jeu de test.", false, "On utilise un jeu de validation ; le test reste intouché."),
    VF("Normaliser les variables est important pour les k plus proches voisins.", true, "La distance est sensible aux échelles."),
  ],
};

const today = (await db.query(
  "select coalesce((select value from app_settings where key='demo_today'), to_char(now() at time zone 'Europe/Paris','YYYY-MM-DD')) d")).rows[0].d;
const hier = new Date(today + "T00:00:00Z"); hier.setUTCDate(hier.getUTCDate() - 1);
const yday = hier.toISOString().slice(0, 10);

const users = [];
for (const [pseudo, email] of [["Alice", "alice@demo.fr"], ["Bob", "bob@demo.fr"], ["Chloé", "chloe@demo.fr"]]) {
  const { rows: [p] } = await db.query(
    "insert into profiles(email,pseudo) values ($1,$2) on conflict (email) do update set pseudo=excluded.pseudo returning id", [email, pseudo]);
  users.push({ pseudo, email, id: p.id });
}

let { rows: [g] } = await db.query("select id from groups where code_invitation='ENSAI1'");
if (!g) ({ rows: [g] } = await db.query("insert into groups(nom,code_invitation,created_by) values ('ENSAI Démo','ENSAI1',$1) returning id", [users[0].id]));
for (const [i, u] of users.entries()) {
  await db.query("insert into group_members(group_id,user_id,role) values ($1,$2,$3) on conflict do nothing", [g.id, u.id, i === 0 ? "admin" : "membre"]);
}

let total = 0;
for (const [nom, qs] of Object.entries(MATIERES)) {
  let { rows: [s] } = await db.query("select id from subjects where group_id=$1 and nom=$2", [g.id, nom]);
  if (!s) ({ rows: [s] } = await db.query(
    "insert into subjects(group_id,nom,created_by,date_debut,jours_par_saison,nb_saisons) values ($1,$2,$3,$4::date,30,1) returning id",
    [g.id, nom, users[0].id, yday]));
  for (const u of users) await db.query("insert into subject_players(subject_id,user_id) values ($1,$2) on conflict do nothing", [s.id, u.id]);
  let { rows: [d] } = await db.query("select id from game_days where subject_id=$1 and saison=1 and jour_dans_saison=1", [s.id]);
  if (!d) ({ rows: [d] } = await db.query(
    "insert into game_days(subject_id,saison,jour_dans_saison,date,statut_generation,fige) values ($1,1,1,$2::date,'ok',true) returning id", [s.id, yday]));
  else await db.query("update game_days set date=$2::date where id=$1 and date >= $3::date", [d.id, yday, today]); // reste dans le passé
  for (const x of qs) {
    const exists = (await db.query("select 1 from questions where subject_id=$1 and enonce=$2", [s.id, x.enonce])).rowCount;
    if (exists) continue;
    await db.query(
      `insert into questions(subject_id,game_day_id,kind,type,enonce,choix,correct_index,explication,source_pages,notion,verifiee)
       values ($1,$2,'new',$3,$4,$5,$6,$7,'{"page_ids":[],"pages":[]}',$8,true)`,
      [s.id, d.id, x.type, x.enonce, JSON.stringify(x.choix), x.correct, x.explication, nom]);
    total++;
  }
}

console.log(`Groupe « ENSAI Démo » (code ENSAI1) prêt, ${total} question(s) ajoutée(s), datées du ${yday}.`);
console.log("Connexion : ouvre /login et saisis alice@demo.fr, bob@demo.fr ou chloe@demo.fr (un e-mail par navigateur).");
await db.end();
