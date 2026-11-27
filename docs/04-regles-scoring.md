# 04 — Règles de classement et de points

Ces règles font foi. Toutes les constantes sont dans un fichier de configuration unique.

## Constantes

| Constante | Valeur | Source |
|-----------|--------|--------|
| `QUESTIONS_PAR_JOUR` | 10 | D4 |
| `QUESTIONS_NOUVELLES` | 7 | D8 |
| `QUESTIONS_REVISION` | 3 | D8 |
| `POINTS_PARTICIPATION` | 10 | valeur par défaut (doc 07) |
| `POINTS_PAR_JOUEUR_BATTU` | 5 | valeur par défaut (doc 07) |
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

Décision D5 : nombre **brut**, non normalisé par la taille du groupe.

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
| Alice | 0 | 42 300 ms | 1 | 4 | 10 + 5×4 = 30 | 45 |
| Bob | 0 | 51 000 ms | 2 | 3 | 25 | 38 (37,5 → 38) |
| Chloé | 1 | 39 000 ms | 3 | 1 | 15 | 23 (22,5 → 23) |
| David | 1 | 39 000 ms | 3 | 1 | 15 | 23 (22,5 → 23) |
| Emma | 3 | 30 000 ms | 5 | 0 | 10 | 15 |

Chloé et David sont à égalité parfaite : même rang, ils ne se battent pas l'un l'autre. Chacun ne bat qu'Emma, donc battus = 1. Emma est la plus rapide, mais elle a le plus d'erreurs : les erreurs passent avant le temps.

### Exemple B — joueur absent

Fanny n'a pas joué le jour 11 : 0 point, et elle n'est comptée comme battue par personne.

### Exemple C — jour 1, joueur seul

Un seul joueur a joué : 0 battu, base 10, multiplicateur 1,00 → 10 points.
