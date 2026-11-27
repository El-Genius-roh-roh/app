# 01 — Vision produit

## Le concept en une phrase

Une app où un groupe d'étudiants répond chaque jour à un quiz de 10 questions sur une partie de son cours, générée automatiquement par IA à partir des slides, avec un classement quotidien et un classement de saison calé sur la date du partiel.

## Pourquoi

Le problème des révisions n'est pas le manque de contenu, c'est le manque de **régularité**. Le format « un défi par jour entre amis » crée l'habitude, et le classement crée la motivation.

## Pour qui

- **Étudiants** (utilisateurs principaux) : jouent chaque jour, consultent les classements, voient quelles slides réviser pour demain.
- **Créateur de matière** : un étudiant (ou un délégué, un prof…) qui importe le cours, les annales, et règle les saisons.

## Vocabulaire

| Terme | Définition |
|-------|-----------|
| **Groupe** | Ensemble de joueurs (ex. une promo, un groupe d'amis). Rejoint via un lien ou un code d'invitation. |
| **Matière** | Un cours au sein d'un groupe. Un groupe peut contenir plusieurs matières. |
| **Document de cours** | PDF (ou slides) importé dans une matière, découpé en pages/slides. |
| **Annale** | Ancien sujet d'examen importé dans une matière, utilisé pour adapter le style et le niveau des questions. |
| **Saison** | Période de N jours de jeu pour une matière. Une matière a S saisons. Le classement de saison repart de zéro à chaque saison. |
| **Jour de jeu** | Un jour du calendrier d'une saison, associé à un ensemble de slides annoncées à l'avance. |
| **Quiz du jour** | 10 questions (7 nouvelles + 3 révision), identiques pour tous les joueurs de la matière ce jour-là, dans un ordre mélangé. |
| **Classement du jour** | Classement des joueurs ayant joué : erreurs croissantes, puis temps croissant. |
| **Classement de saison** | Somme des points quotidiens d'une matière sur la saison. |
| **Classement général du groupe** | Somme des points de toutes les matières du groupe. |

## Boucle de jeu quotidienne

1. Le joueur ouvre l'app, voit le quiz du jour et les slides concernées.
2. Il lance le quiz : 10 questions, chronométrées, une seule tentative.
3. À la fin : score, temps, **correction immédiate** avec explications et numéros de slides.
4. Il voit sa position provisoire dans le classement du jour, puis le classement de saison.
5. Il voit quelles slides seront au programme de demain.

## Principes produit

- **Juste** : tout le monde a les mêmes questions et sait à l'avance ce qui sera demandé.
- **Rapide** : un quiz se fait en quelques minutes, sur téléphone.
- **Utile** : chaque erreur renvoie à la slide à relire ; la révision lutte contre l'oubli.
- **Zéro friction côté créateur** : il importe ses PDF, règle les dates, et l'IA fait le reste.
