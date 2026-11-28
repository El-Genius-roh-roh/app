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

## 8. Jeu du jour, gemmes, rattrapage, trophées, ligue et badges (D29, D30, D31, D46, D47 ; remplacent D24, D36, D37 pour les gemmes solo, D41)

### Jeu du jour (D46)

Chaque matière a **un jeu du jour**, toujours sur les questions du jour (découpage du cours du jour + quelques révisions, §1 du doc 03). Le jeu change chaque jour par roulement (`DEFI.FORMATS`), **décalé selon la matière** (D50) : le même jour, deux matières n'ont pas forcément le même jeu. Tous les joueurs d'un même jour d'une matière ont le même jeu (celui du premier qui l'a commencé) :

| Jeu | Déroulé | Classement du jour |
|-----|---------|--------------------|
| **QCM** | les 10 questions, une par une | erreurs, puis temps |
| **Memory** | les QCM du jour (8 max., `DEFI.MEMORY_PAIRES`) en paires énoncé ↔ bonne réponse, face cachée ; chaque paire retournée est vérifiée par le serveur | **temps** seul (toutes les paires sont trouvées ; une paire ratée fait perdre du temps) |
| **Mort subite** | QCM à la suite, **la première erreur termine la partie** | longueur de la série (= 10 − erreurs, les questions non jouées comptent comme erreurs), puis temps |
| **Relier** | chaque question à relier à sa réponse, piochée dans une réserve qui se vide | erreurs, puis temps |

Le Memory a besoin d'au moins 4 paires (`DEFI.MEMORY_MIN_PAIRES`), Relier d'au moins 2 QCM : sinon le jour se joue en QCM. Un rattrapage garde le jeu de son jour. Les rangs, « joueurs battus » (§2) et gemmes se calculent avec le critère du jeu (`critereDe`).

### Gemmes (chaque jeu du jour)

Les « points du jour » du §4 s'affichent sous le nom de **gemmes**. Ils ne sont jamais négatifs :

```
gemmes(j) = arrondi( (10 + 10 × joueurs_derrière(j)) × multiplicateur(jour) × (1 − 0,10 × retard) )
```

`joueurs_derrière(j)` = joueurs battus au §2 selon le critère du jeu (égalité parfaite : ne compte pas).

**Encouragement (D51)** : un joueur dans le **dernier quart du classement de la saison** (classement aux gemmes des jours précédents de la saison, parmi ceux qui ont déjà joué) gagne **+20 %** de gemmes à son jeu du jour (`BONUS_DERNIER_QUART`), après la pénalité de retard. Il faut qu'au moins un jour précédent de la saison ait un classement. Dernier quart = moins d'un quart des joueurs classés (arrondi au-dessus) derrière soi, sans être à égalité en tête : 2 à 4 joueurs → le dernier ; 5 à 8 → les 2 derniers. Le rang du jour ne change pas.

```
gemmes(j) = arrondi( (10 + 10 × joueurs_derrière(j)) × multiplicateur × (1 − 0,10 × retard) × (1,2 si dernier quart) )
``` Le classement de saison (§5) et le classement général (§6) se font aux gemmes. Les activités solo (flashcards, Memory et Relier hors jeu du jour, Arène contre des bots) **ne rapportent pas de gemmes** (D47) : elles comptent pour les succès et les défis du tableau de bord.

### Rattrapage (D29)

Un jeu du jour manqué peut être joué **jusqu'à 3 jours après** sa date (`RATTRAPAGE_JOURS`). Les retards s'accumulent : on peut rattraper plusieurs jeux. Au-delà de 3 jours, le jeu n'est plus jouable.

Chaque jour de retard retire **10 %** des gemmes (`PENALITE_RETARD_PAR_JOUR`) : 1 jour → 90 %, 2 jours → 80 %, 3 jours → 70 %. Le retard ne change pas le rang du joueur dans le classement de ce jour.

Les résultats d'un jour restent provisoires (d'autres joueurs peuvent encore le rattraper) et ne sont figés qu'une fois le délai de rattrapage passé.

### Trophées de fin de saison (D30, rétabli par D47 ; remplace D36)

Les trophées sont donnés **à la fin de la saison de chaque matière**, d'après le classement de la saison aux gemmes (§5), parmi les joueurs qui ont joué au moins un jeu du jour de la saison :

```
trophées(j) = PAR_JOUR_PAR_JOUEUR_DERRIERE (1) × jours de la saison × joueurs classés derrière j
```

- Plus la saison est longue et le groupe grand, plus il y a de trophées en jeu ; le dernier (et un joueur seul) n'en gagne pas ; les ex æquo gagnent autant.
- Les trophées ne se **perdent jamais**.
- Pendant la saison, l'écran montre les trophées **en jeu** (ce que chacun gagnerait si la saison s'arrêtait aujourd'hui), en gris.

Exemple : saison de 30 jours, 4 joueurs classés A, B, C, D → A +90, B +60, C +30, D +0.

### Ligue unique (D47)

La ligue d'un joueur est **unique** : elle dépend du total de ses trophées, **toutes matières et tous groupes confondus** (saisons terminées) :

| Ligue | Bronze | Argent | Or | Platine | Diamant | Maître |
|-------|--------|--------|----|---------|---------|--------|
| À partir de (trophées) | 0 | 100 | 250 | 500 | 800 | 1 200 |

Comme les trophées ne se perdent pas, on ne descend jamais de ligue. Un clic sur la carte « Ma ligue » ouvre la page **Ligues** (`/ligues`) : toutes les ligues, les trophées nécessaires pour chacune, la sienne et ce qui manque.

### Écrans (D31, D49)

- **Accueil**, trois onglets : **Aujourd'hui** (groupes, jeux du jour, rattrapages, défis du jour), **Ligue et succès** (ma ligue, mon classement par groupe, mes succès), **Solo et flashcards** (flashcards, Memory, Relier par matière).
- **Page d'un groupe**, deux onglets : **Jeux du jour** (matières et **classement général** aux gemmes, en grand) et **Compétitif** (ma ligue, classement des trophées du groupe, saisons en cours avec les trophées en jeu, badges, saisons terminées).
- L'**Arène** (et le jeu de plateau) ne s'ouvre qu'une fois **tous les jeux du jour** joués ; tout le reste reste accessible.

### Badges

| Badge | Condition | Cumulable |
|-------|-----------|-----------|
| 1er du jour | rang 1 d'un quiz du jour, avec au moins 2 joueurs ce jour-là | oui (×N) |
| Sans faute | 0 erreur à un jeu du jour (Memory : aucune paire ratée ; Mort subite : série complète) | oui |
| Le plus rapide | temps le plus court du jour, avec au moins 2 joueurs | oui |
| Série de 3 / 7 / 30 jours | jours consécutifs avec au moins un quiz terminé dans le groupe | non |
| 10 / 50 quiz joués | nombre de quiz terminés dans le groupe | non |
