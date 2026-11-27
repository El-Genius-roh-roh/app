# 00 — Historique des décisions

Journal chronologique du projet. **Toute nouvelle décision s'ajoute en bas**, avec sa date, sans effacer les anciennes (une décision remplacée est marquée « remplacée par … »).

---

## 2026-11-27 — Idée initiale

Projet : une application au format de Playus (jeu quotidien entre amis), adaptée pour travailler les matières de cours.

Demandes d'origine :

- L'application doit avoir un format comme celui de Playus.
- Elle doit permettre d'importer des slides ou des fichiers PDF et créer elle-même les quiz pour chaque matière.
- On peut aussi fournir des annales pour que les quiz s'adaptent aux attentes du professeur.
- Au sein de chaque groupe, il peut y avoir plusieurs matières.
- Chaque jour, les étudiants sont interrogés sur 5 à 10 questions auxquelles ils doivent répondre le plus vite possible sans faire d'erreur (classement d'abord au nombre d'erreurs, ensuite au temps).
- Le créateur de la matière choisit le nombre de jours d'une saison et le nombre de saisons (pour coller à la date du partiel, par exemple). En fonction du nombre de jours, l'app découpe le cours intelligemment pour en traiter une partie chaque jour. Les utilisateurs savent à l'avance sur quelles slides ils seront interrogés.
- Chaque jour, chaque joueur gagne des points selon son classement ; ils s'accumulent dans le classement général de la saison. Si un groupe a plusieurs matières, il peut y avoir un classement général du groupe.
- Un petit multiplicateur augmente au fil des jours pour éviter que quelqu'un soit irrattrapable.
- Des points sont gagnés pour avoir joué, et des points pour chaque personne qui fait un moins bon score que nous.

## 2026-11-27 — Analyse critique

Points soulevés lors de la revue de l'idée :

1. **Qualité des questions générées** : les slides sont souvent pauvres en texte ; une question fausse fausse tout le classement du jour puisque les erreurs sont le premier critère.
2. **Triche** : tout le monde a les mêmes questions le même jour ; le premier joueur peut transmettre les réponses.
3. **Départage au temps** : avec peu de questions, beaucoup d'égalités à 0 erreur, donc le temps décide de tout.
4. **Points « par personne battue »** : dépendent de la taille du groupe, ce qui rend les groupes et les matières difficilement comparables.
5. **Multiplicateur** : un multiplicateur fort rend les derniers jours écrasants.
6. **Oubli** : si chaque jour ne porte que sur de nouvelles slides, les premiers chapitres sont oubliés avant le partiel.
7. **Correction** : sans explication des erreurs, on joue sans apprendre.
8. **Pratique** : cours publié au fur et à mesure, densité variable des slides, saisons de matières désynchronisées, droits sur les slides des professeurs, RGPD, coût des appels IA.

## 2026-11-27 — Décisions

| # | Sujet | Décision | Alternatives écartées | Raison |
|---|-------|----------|-----------------------|--------|
| D1 | Qualité des questions | Pas de validation humaine. L'IA est responsable de la qualité et s'inspire des annales. | Validation manuelle par le créateur ; bouton de contestation | Choix produit : fluidité. Compensé techniquement par une passe de vérification IA automatique (voir doc 03). |
| D2 | Triche | Confiance aux utilisateurs. Ordre des questions **et** des choix mélangé pour chaque joueur. | Pool de questions différent par joueur ; réponses cachées jusqu'à minuit | Simplicité ; groupes d'amis. |
| D3 | Correction | Les bonnes réponses et les explications sont montrées **immédiatement après la fin du quiz**. | Révélation à la fin de la journée | Aider l'élève à comprendre ses erreurs tout de suite. |
| D4 | Nombre de questions | **10 questions** par jour. | 5 questions | Moins d'égalités, meilleure couverture. |
| D5 | Points par personne battue | Conservé tel quel (nombre brut de joueurs battus, non normalisé). | Pourcentage du groupe battu | Choix produit. |
| D6 | Multiplicateur | **Linéaire** : +5 % par jour → `1 + 0,05 × (jour − 1)`. Jour 30 = ×2,45. | Composé (×1,05 par jour, jour 30 = ×4,1, jour 60 = ×18,7) ; linéaire plafonné | Le composé explose sur les saisons longues. |
| D7 | Plateforme | **Web app mobile (PWA)** : un seul code, installable sur téléphone sans store. | App native iOS/Android | Simplicité du premier jet. |
| D8 | Révision | Quiz du jour = **7 questions nouvelles** (slides du jour) + **3 questions de révision**. Les questions de révision sont **nouvellement générées** et portent uniquement sur les slides des jours précédents (jamais des questions déjà posées). | 100 % slides du jour ; 8 + 2 ; ratio réglable | Lutter contre l'oubli avant le partiel. |
| D9 | Journée de jeu | Quiz disponible de **00h00 à 23h59 (heure de Paris)**, **une seule tentative**. Quiz raté = 0 point, pas de rattrapage. | Créneau limité ; rattrapage sans points | Simplicité, règle claire. |

Les points restés sans décision explicite ont reçu une valeur par défaut, listée dans `07-questions-ouvertes.md`.

## 2026-11-27 — Retours après les premiers tests

| # | Sujet | Décision | Alternatives écartées | Raison |
|---|-------|----------|-----------------------|--------|
| D14 | Révision | Quiz du jour = **6 nouvelles + 4 révision** (remplace le 7 + 3 de D8). | 7 + 3 | Plus de révision pour lutter contre l'oubli. |
| D15 | Points | **10 pts pour avoir joué + 10 pts par joueur battu** (au lieu de 5). Égalité parfaite : aucun point l'un sur l'autre. Nombre brut : plus le groupe est grand, plus il y a de joueurs à battre. Multiplicateur D6 inchangé. | Pourcentage du groupe battu ; bonus selon la taille du groupe | Choix produit : simple, et récompense de battre plus de monde. |
| D16 | Affichage | Les points ne sont plus affichés dans les classements : on affiche des **ligues** (Bronze → Argent → Or → Platine → Diamant → Maître, selon les points cumulés dans le groupe) et une **vitrine de trophées** (1er du jour, sans faute, le plus rapide, séries de 3/7/30 jours, 10/50 quiz joués). Les points restent la base du tri. Voir doc 04 §8. | Trophées seuls ; médailles du jour | Plus motivant et plus « addictif » qu'un nombre de points. |
| D17 | Contenu des questions | Pas de question sur ce qui n'est pas la matière (enseignant, contacts, organisation, examens, bibliographie). Sur les exemples du cours : questions d'**application** (même méthode, autres valeurs), jamais sur les données précises de l'exemple. | — | Questions jugées inutiles lors des tests. |
| D18 | Formules | Toutes les formules sont écrites en **LaTeX** (`$…$`) et affichées avec KaTeX (énoncés, choix, explications). Une réponse n'est jamais tronquée : un fait trop long est écarté plutôt que coupé. | Texte brut | Lisibilité des cours de maths/stats ; réponses coupées constatées. |
