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

## 8. Ligues et trophées (D16)

Les points ci-dessus restent la base de **tous les classements**, mais ne sont plus affichés tels quels.

**Ligue** d'un joueur dans un groupe = selon ses points cumulés dans le groupe (§6) :

| Ligue | Bronze 🥉 | Argent 🥈 | Or 🥇 | Platine 💠 | Diamant 💎 | Maître 👑 |
|-------|-----------|-----------|-------|-----------|-----------|-----------|
| À partir de | 0 | 200 | 500 | 1 000 | 2 000 | 3 500 |

La page du groupe montre la ligue, la progression vers la suivante (« encore N pts ») et la série de jours en cours.

**Trophées** (calculés à partir des résultats quotidiens du groupe, toutes matières) :

| Trophée | Condition | Cumulable |
|---------|-----------|-----------|
| 🏆 1er du jour | rang 1 d'un quiz du jour, avec au moins 2 joueurs ce jour-là | oui (×N) |
| 🎯 Sans faute | 0 erreur à un quiz du jour | oui |
| ⚡ Le plus rapide | temps le plus court du jour, avec au moins 2 joueurs (même s'il a fait des erreurs) | oui |
| 🔥 Série de 3 / 7 / 30 jours | jours consécutifs avec au moins un quiz terminé dans le groupe | non (débloqué une fois) |
| 📚 10 / 50 quiz joués | nombre de quiz terminés dans le groupe | non |

Série en cours : elle continue tant que le dernier jour joué est aujourd'hui ou hier.
