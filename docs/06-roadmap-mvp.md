# 06 — Roadmap

Chaque phase se termine par une app **fonctionnelle et testée** avant de passer à la suivante.

## Phase 1 — Socle

- [ ] Projet Next.js + TypeScript + Tailwind + Supabase, PWA installable
- [ ] Authentification (lien magique + Google), profil avec pseudo
- [ ] Groupes : création, invitation par lien et code, rôles
- [ ] Matières : création avec date de début, jours par saison, nombre de saisons
- [ ] Fichier de configuration centralisé (constantes du doc 04)

**Fin de phase** : on peut créer un groupe, inviter un ami et créer une matière.

## Phase 2 — Import et programme

- [ ] Upload PDF (cours et annales), stockage
- [ ] Extraction texte + images des pages (tâche de fond, statut visible)
- [ ] Analyse IA des pages (type, chapitre, densité, notions)
- [ ] Découpage en jours (algorithme déterministe, doc 03 étape 3) + tests
- [ ] Calendrier « programme » : slides de chaque jour, consultables
- [ ] Ajout de documents en cours de saison → redécoupage des jours futurs uniquement
- [ ] Profil d'examen à partir des annales

**Fin de phase** : on importe un cours et on voit le programme jour par jour.

## Phase 3 — Quiz

- [ ] Génération des 7 nouvelles + 3 révision (consignes et JSON du doc 03)
- [ ] Passe de vérification IA + régénération des questions rejetées
- [ ] Job de génération J-1 + rattrapage
- [ ] Parcours de quiz : start / answer / fin, temps serveur, ordre mélangé, une seule tentative
- [ ] Clôture automatique des tentatives abandonnées
- [ ] Écran de correction immédiate (explication + lien vers la slide)
- [ ] Historique des quiz passés

**Fin de phase** : on joue le quiz du jour et on voit sa correction.

## Phase 4 — Classements

- [ ] Calcul du classement du jour, des joueurs battus, du multiplicateur et des points (doc 04), avec **tous les exemples du doc 04 en tests**
- [ ] Résultats provisoires, puis figés à minuit
- [ ] Classement de saison, classement général du groupe
- [ ] Fin de saison : podium, passage à la saison suivante

**Fin de phase = MVP complet. Tester avec une vraie promo pendant 2 semaines.**

## Phase 5 — Après le MVP

- [ ] Notifications push (rappel quotidien, dépassement, fin de saison)
- [ ] Import .pptx (conversion en PDF côté serveur)
- [ ] Tableau de suivi des coûts IA (table `ai_calls`)
- [ ] Statistiques personnelles (notions les plus ratées, séries de jours joués)
- [ ] Polissage visuel, animations de résultat
