# 05 — Architecture technique

Décision D7 : **web app mobile (PWA)**. Stack recommandée (Claude Code peut proposer mieux s'il le justifie dans `00-historique-decisions.md`) :

| Besoin | Choix |
|--------|-------|
| Front + API | **Next.js** (App Router) + **TypeScript** |
| UI | **Tailwind CSS**, design mobile-first |
| PWA | manifest + service worker (installable, notifications push Web Push) |
| Base de données | **PostgreSQL** via **Supabase** |
| Authentification | Supabase Auth (lien magique + Google) |
| Fichiers | Supabase Storage (PDF, images des pages) |
| Jobs planifiés | Supabase `pg_cron` + Edge Functions, ou cron de l'hébergeur |
| IA | API Claude via le SDK `@anthropic-ai/sdk`, côté serveur uniquement |
| PDF | extraction du texte (`pdfjs-dist`) et rendu des pages en PNG |
| Tests | Vitest (unitaires, scoring obligatoire), Playwright (parcours principal) |

Sécurité : Row Level Security Supabase — un utilisateur ne lit que les groupes dont il est membre. La bonne réponse d'une question **n'est jamais envoyée au client avant que le joueur ait répondu** à cette question.

## Modèle de données

```
profiles          (id, pseudo, avatar_url, notif_heure, created_at)

groups            (id, nom, code_invitation, created_by, created_at)
group_members     (group_id, user_id, role: admin|membre, joined_at)

subjects          (id, group_id, nom, created_by,
                   date_debut, jours_par_saison, nb_saisons,
                   profil_examen jsonb, created_at)
subject_players   (subject_id, user_id, actif bool)

documents         (id, subject_id, categorie: cours|annale, ordre,
                   fichier_path, nb_pages, statut: traitement|pret|erreur)
document_pages    (id, document_id, numero, texte, image_path,
                   type, chapitre, densite, notions jsonb)

game_days         (id, subject_id, saison, jour_dans_saison, date,
                   statut_generation: attente|ok|echec, fige bool)
game_day_pages    (game_day_id, page_id)          -- programme du jour

questions         (id, subject_id, game_day_id, kind: new|revision,
                   type: qcm|vrai_faux, enonce, choix jsonb,
                   correct_index, explication, source_pages jsonb,
                   notion, verifiee bool)

attempts          (id, game_day_id, user_id, ordre_questions jsonb,
                   ordre_choix jsonb, started_at, finished_at,
                   erreurs, duree_ms, statut: en_cours|terminee|cloturee)
attempt_answers   (attempt_id, question_id, choix_index, correct,
                   answered_at)

daily_results     (game_day_id, user_id, rang, joueurs_battus,
                   points_base, multiplicateur, points, provisoire bool)

ai_calls          (id, subject_id, etape, modele, tokens_in, tokens_out,
                   duree_ms, statut, created_at)
```

Contraintes : `UNIQUE(game_day_id, user_id)` sur `attempts` (une seule tentative) ; `UNIQUE(subject_id, saison, jour_dans_saison)` sur `game_days`.

Classements de saison et général : **vues SQL** (ou vues matérialisées rafraîchies à minuit) agrégeant `daily_results`.

## Déroulement d'un quiz (API)

1. `POST /api/quiz/{gameDayId}/start` → crée la tentative (refus si elle existe déjà ou hors de 00h–23h59 Paris), tire l'ordre mélangé, renvoie la question 1 **sans la bonne réponse**, et enregistre `started_at`.
2. `POST /api/quiz/{attemptId}/answer` → enregistre la réponse et l'heure serveur, puis renvoie la question suivante (toujours sans la réponse).
3. Après la 10ᵉ réponse : `finished_at`, calcul des erreurs et de `duree_ms`, recalcul des `daily_results` provisoires du jour, puis renvoi de la **correction complète**.

## Jobs planifiés

| Heure (Paris) | Job |
|---------------|-----|
| 00h00 | Clôturer les tentatives en cours de la veille, figer les `daily_results` de la veille, rafraîchir les classements |
| Toutes les 5 min | Clôturer les tentatives de plus de 15 min |
| 03h00 | Générer les questions du lendemain pour chaque matière active (+ rattrapage des jours en échec) |
| 19h00 (ou heure du joueur) | Rappel push aux joueurs n'ayant pas joué |

Tous les jobs sont **idempotents** : les relancer ne crée ni doublon ni double comptage.

## Traitements asynchrones

L'import d'un PDF (extraction, analyse IA, découpage) peut prendre du temps : il se fait en tâche de fond, avec un statut affiché dans l'interface et non dans la requête HTTP d'upload.

## Données personnelles et droits

- RGPD : suppression de compte possible (supprime le profil et anonymise les résultats) ; collecte minimale (e-mail, pseudo).
- Les documents importés ne sont visibles que par les membres du groupe. Les conditions d'utilisation précisent que l'utilisateur doit avoir le droit de partager les documents qu'il importe.
