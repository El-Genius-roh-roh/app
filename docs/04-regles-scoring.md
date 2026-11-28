# 04 — Règles de classement et de points

Ces règles font foi. Toutes les constantes sont dans un fichier de configuration unique.

## Constantes

| Constante | Valeur | Source |
|-----------|--------|--------|
| `QUESTIONS_PAR_JOUR` | 10 | D4 |
| `QUESTIONS_NOUVELLES` | 6 | D8, D14 |
| `QUESTIONS_REVISION` | 4 | D8, D14 |
| `POINTS_PARTICIPATION` | 10 | valeur par défaut (doc 07) |
| `POINTS_PAR_JOUEUR_BATTU` | 10 | D15 |
| `BONUS_MULTIPLICATEUR_PAR_JOUR` | 0,05 | D6 |
| `DUREE_MAX_TENTATIVE_MIN` | 15 | valeur par défaut (doc 07) |
| `FUSEAU` | Europe/Paris | D9 |

## 1. Classement du jour (par matière)

Ne sont classés que les joueurs ayant **terminé** (ou dont la tentative a été clôturée) le quiz du jour.

Tri :
1. **nombre d'erreurs** croissant ;
2. puis **temps total** croissant (en millisecondes, mesuré côté serveur).

Égalité parfaite (mêmes erreurs **et** même temps en ms) : même rang, et aucun des deux ne « bat » l'autre.

Rang : classement standard « 1, 2, 2, 4 ».

## 2. Joueurs battus

```
joueurs_battus(j) = nombre de joueurs classés ce jour-là ayant
                    (erreurs > erreurs_j) OU (erreurs = erreurs_j ET temps > temps_j)
```

Les joueurs n'ayant pas joué ne comptent **pas** comme battus (voir doc 07).

Décision D5 : nombre **brut**, non normalisé par la taille du groupe : plus le groupe est grand, plus il y a de joueurs à battre (D15).

## 3. Multiplicateur

Décision D6 — linéaire, par saison :

```
multiplicateur(d) = 1 + 0,05 × (d − 1)
```

`d` = numéro du jour **dans la saison** (1 à N). Le multiplicateur repart à 1 au début de chaque saison.

| Jour | 1 | 10 | 20 | 30 | 60 |
|------|---|----|----|----|----|
| × | 1,00 | 1,45 | 1,95 | 2,45 | 3,95 |

## 4. Points du jour

```
points_base(j) = POINTS_PARTICIPATION + POINTS_PAR_JOUEUR_BATTU × joueurs_battus(j)
points(j)      = arrondi_entier( points_base(j) × multiplicateur(d) )
```

Arrondi : à l'entier le plus proche, .5 vers le haut. Non-participant : 0 point.

Les points du jour sont **provisoires** pendant la journée (recalculés à chaque nouvelle tentative terminée) et **figés à 00h00** par un job (après clôture des tentatives abandonnées).

## 5. Classement de saison (par matière)

```
points_saison(j) = Σ points(j) sur les jours de la saison
```

Égalité : départage par le nombre total d'erreurs sur la saison (croissant), puis par le temps total (croissant).

## 6. Classement général du groupe

```
points_general(j) = Σ points(j) sur toutes les matières du groupe, sur la période affichée
```

Périodes affichables : « depuis le début » (par défaut) et « 30 derniers jours ». Un joueur qui ne joue pas une matière gagne 0 point dans celle-ci.

## 7. Exemples (à transformer en tests unitaires)

### Exemple A — jour 11 d'une saison (multiplicateur 1,50), 5 joueurs ont joué

| Joueur | Erreurs | Temps | Rang | Battus | Base | Points |
|--------|---------|-------|------|--------|------|--------|
| Alice | 0 | 42 300 ms | 1 | 4 | 10 + 10×4 = 50 | 75 |
| Bob | 0 | 51 000 ms | 2 | 3 | 40 | 60 |
| Chloé | 1 | 39 000 ms | 3 | 1 | 20 | 30 |
| David | 1 | 39 000 ms | 3 | 1 | 20 | 30 |
| Emma | 3 | 30 000 ms | 5 | 0 | 10 | 15 |

Chloé et David sont à égalité parfaite : même rang, ils ne se battent pas l'un l'autre. Chacun ne bat qu'Emma, donc battus = 1. Emma est la plus rapide, mais elle a le plus d'erreurs : les erreurs passent avant le temps.

### Exemple B — joueur absent

Fanny n'a pas joué le jour 11 : 0 point, et elle n'est comptée comme battue par personne.

### Exemple C — jour 1, joueur seul

Un seul joueur a joué : 0 battu, base 10, multiplicateur 1,00 → 10 points.

## 8. Gemmes, rattrapage, trophées, ligues et badges (D29, D31, D36, D37 ; remplacent D24 et D30)

### Gemmes (chaque quiz du jour)

Les « points du jour » du §4 s'affichent sous le nom de **gemmes**. Ils ne sont jamais négatifs :

```
gemmes(j) = arrondi( (10 + 10 × joueurs_derrière(j)) × multiplicateur(jour) × (1 − 0,10 × retard) )
```

`joueurs_derrière(j)` = joueurs battus au §2 (égalité parfaite : ne compte pas). Le classement de saison (§5) et le classement général (§6) se font aux gemmes.

### Rattrapage (D29)

Un quiz du jour manqué peut être joué **jusqu'à 3 jours après** sa date (`RATTRAPAGE_JOURS`). Les retards s'accumulent : on peut rattraper plusieurs quiz. Au-delà de 3 jours, le quiz n'est plus jouable.

Chaque jour de retard retire **10 %** des gemmes (`PENALITE_RETARD_PAR_JOUR`) : 1 jour → 90 %, 2 jours → 80 %, 3 jours → 70 %. Le retard ne change pas le rang du joueur dans le classement de ce quiz.

Les résultats d'un quiz restent provisoires (d'autres joueurs peuvent encore le rattraper) et ne sont figés qu'une fois le délai de rattrapage passé.

### Trophées de la semaine (D36, remplace D30)

Chaque semaine (du lundi au dimanche, heure de Paris), dans chaque groupe :

```
score_semaine = gemmes des quiz du jour de la semaine (toutes matières) + gemmes solo de la semaine (D37)
trophées      = + SEMAINE_GAINS[rang − 1]  (1er : +20 ; ex æquo : même gain ; score nul : pas classé)
                − 10 × quiz du jour manqués   (PENALITE_QUIZ_MANQUE)
```

- Un **quiz manqué** est un quiz du jour d'une matière suivie, daté après l'arrivée du joueur dans le groupe, jamais terminé et qui n'est plus rattrapable (plus de 3 jours de retard). Un rattrapage compte dans la semaine d'origine du quiz.
- Une semaine est **réglée** quand son dernier quiz n'est plus rattrapable : le jeudi suivant (dimanche + 3 jours < aujourd'hui). Avant, son bilan est **provisoire** (affiché en gris).
- Le total de trophées ne descend **jamais sous 0** ; le plancher s'applique semaine après semaine.

Exemple (groupe A, B, C) :
- Semaine 1 : A 120 gemmes, B 80 + 15 solo, C ne joue pas et manque 2 quiz → A +20 (20), B 0 (0), C −20 → **0** (plancher).
- Semaine 2 : A 70, B 60 + 15 solo = 75, C 75 → B et C ex æquo 1ers : +20 chacun. Totaux : A 20, B 20, C 20.

### Gemmes solo (D37)

Chaque session solo **terminée** rapporte **5 gemmes solo** (`SOLO.GEMMES_PAR_SESSION`), plafonnées à **15 par jour** et par groupe (`SOLO.MAX_PAR_JOUR`) :
- une session de **flashcards**, un **Memory** (ouvert après le défi du jour, D45) ou une partie de **Relier** (outil de révision) terminée dans une matière (au moins 3 cartes / 4 paires disponibles) ;
- une partie d'**Arène contre des bots** (non classée, au moins une réponse donnée), enregistrée par le serveur.

Elles comptent uniquement dans le score de la semaine : ni dans les classements des quiz du jour, ni dans ceux des saisons, et elles **n'annulent pas** la pénalité d'un quiz manqué. Le jeu de plateau n'en rapporte pas.

### Ligues (D36)

La ligue dépend du total de trophées dans le groupe :

| Ligue | Bronze | Argent | Or | Platine | Diamant | Maître |
|-------|--------|--------|----|---------|---------|--------|
| À partir de (trophées) | 0 | 100 | 250 | 500 | 800 | 1 200 |

Elle n'est recalculée **qu'à la fin de chaque mois** : la ligue du mois en cours est celle des trophées à la fin du mois précédent. On peut **monter comme descendre**. Une semaine compte pour le mois de son dimanche. L'écran indique ce qui se passera à la fin du mois (« tu montes en Or », « tu restes », « tu descends en Bronze »).

Exemple : 5 semaines gagnées jusqu'au 25 octobre (100 trophées) → **Argent** pour tout novembre, même après 2 quiz manqués début novembre (80). Au 1er décembre, 80 trophées → **Bronze**.

### Écrans (D31)

Page d'un groupe, deux onglets :
- **Défi du jour** : matières (quiz du jour fait ou à faire, quiz à rattraper) et **classement général** aux gemmes, en grand.
- **Compétitif** : ma ligue (et le verdict de fin de mois), la semaine en cours (score, gain ou perte provisoire), classement des trophées, badges, semaines précédentes.

### Badges

| Badge | Condition | Cumulable |
|-------|-----------|-----------|
| 1er du jour | rang 1 d'un quiz du jour, avec au moins 2 joueurs ce jour-là | oui (×N) |
| Sans faute | 0 erreur à un quiz du jour | oui |
| Le plus rapide | temps le plus court du jour, avec au moins 2 joueurs | oui |
| Série de 3 / 7 / 30 jours | jours consécutifs avec au moins un quiz terminé dans le groupe | non |
| 10 / 50 quiz joués | nombre de quiz terminés dans le groupe | non |
