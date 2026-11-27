# Instructions pour Claude Code

Ce dépôt contient le cahier des charges d'une application de révision gamifiée, inspirée du principe de Playus (défi quotidien entre amis), mais appliquée aux matières de cours.

## Ordre de lecture obligatoire

1. `docs/00-historique-decisions.md` — d'où vient le projet et pourquoi chaque choix a été fait
2. `docs/01-vision-produit.md` — le concept et le vocabulaire
3. `docs/02-fonctionnalites.md` — ce que l'app doit faire, écran par écran
4. `docs/03-generation-questions-ia.md` — comment l'IA crée les quiz
5. `docs/04-regles-scoring.md` — classements et points (formules exactes)
6. `docs/05-architecture-technique.md` — stack, modèle de données, jobs
7. `docs/06-roadmap-mvp.md` — l'ordre de construction, phase par phase
8. `docs/07-questions-ouvertes.md` — valeurs par défaut choisies en attendant une décision

## Règles de travail

- Construis l'application **phase par phase** en suivant `docs/06-roadmap-mvp.md`. Ne commence pas une phase avant que la précédente fonctionne et soit testée.
- Les formules de `docs/04-regles-scoring.md` font foi : implémente-les exactement et couvre-les par des tests unitaires (les exemples chiffrés du document doivent devenir des tests).
- Toutes les valeurs réglables (points, multiplicateur, nombre de questions, ratio révision…) sont des **constantes de configuration centralisées**, jamais codées en dur dans la logique.
- L'interface est **en français**. Le fuseau horaire de référence est **Europe/Paris**.
- Si un point est ambigu : regarde d'abord `docs/07-questions-ouvertes.md`. S'il n'y est pas, choisis l'option la plus simple, puis **ajoute une entrée** dans `docs/07-questions-ouvertes.md` et dans `docs/00-historique-decisions.md`.
- Ne reprends ni le nom, ni le logo, ni la charte graphique de Playus : seul le principe de jeu est une inspiration.
- Ne mets jamais de clé API côté client. Tous les appels à l'IA passent par le serveur.
