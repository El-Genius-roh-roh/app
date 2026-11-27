# 02 — Fonctionnalités

## 1. Comptes

- Inscription / connexion par **lien magique par e-mail** et **Google**.
- Profil : pseudo (affiché dans les classements), avatar facultatif.

## 2. Groupes

- Créer un groupe (nom, image facultative). Le créateur est **admin du groupe**.
- Inviter via un **lien** ou un **code à 6 caractères**.
- Rôles : `admin` (gère le groupe, les membres, peut créer des matières) et `membre`.
- Un membre peut quitter le groupe ; un admin peut retirer un membre.
- Page du groupe : liste des matières, classement général du groupe.

## 3. Matières

Création d'une matière (par un admin du groupe, voir `07-questions-ouvertes.md`) :

| Champ | Description |
|-------|-------------|
| Nom | ex. « Biochimie S3 » |
| Date de début | premier jour de jeu |
| Jours par saison | N (ex. 30) |
| Nombre de saisons | S (ex. 2) |
| Jours de jeu | tous les jours par défaut (voir questions ouvertes) |

- Le créateur de la matière en est **gestionnaire** : il importe les documents et modifie les réglages.
- Les réglages de calendrier sont modifiables tant que la matière n'a pas commencé ; ensuite, seuls les **jours futurs** peuvent être modifiés.
- Un membre du groupe choisit quelles matières il joue (par défaut : toutes).

## 4. Import des documents

- Types acceptés : **PDF** (MVP). Slides PowerPoint (.pptx) en phase ultérieure, converties en PDF côté serveur.
- Deux catégories : **document de cours** et **annale**.
- Plusieurs documents de cours par matière, ordonnables (glisser-déposer) : l'ordre définit l'ordre du programme.
- **Ajout en cours de saison** : le créateur peut ajouter des documents à tout moment (les profs publient au fur et à mesure). Le découpage des **jours futurs** est alors recalculé ; les jours passés et le jour en cours ne bougent jamais.
- Après l'import : traitement (extraction du texte et des images de chaque page), avec un état visible : `en traitement` → `prêt` / `erreur`.

## 5. Découpage du cours en jours

- Le cours complet (tous les documents de cours, dans l'ordre) est réparti sur l'ensemble des jours de toutes les saisons (N × S jours). Voir questions ouvertes.
- Le découpage est **intelligent** : il se fait selon la **densité de contenu** et pas selon le nombre de slides (10 slides de titres ≠ 10 slides de formules). Il respecte autant que possible les frontières de chapitres. Détail dans `03-generation-questions-ia.md`.
- Les slides de titre, sommaire ou remerciements ne comptent pas comme contenu.
- **Programme visible** : un calendrier montre, pour chaque jour, les slides au programme (document + numéros de pages + titre de la partie). Les joueurs peuvent ouvrir ces slides dans l'app.
- Si le cours ne contient pas assez de contenu pour tous les jours, les jours restants deviennent des **jours de révision** (10 questions de révision).

## 6. Quiz du jour

- Disponible de **00h00 à 23h59, heure de Paris**.
- **10 questions** : 7 nouvelles sur les slides du jour + 3 de révision sur les slides des jours précédents (questions nouvellement générées). Les premiers jours, s'il n'y a pas encore de slides passées, les 10 questions portent sur le jour.
- Types de questions : **QCM à 4 choix (une seule bonne réponse)** et **vrai/faux**.
- Les mêmes 10 questions pour tous les joueurs de la matière ce jour-là ; **ordre des questions et ordre des choix mélangés** pour chaque joueur.
- **Une seule tentative.** Une fois le quiz commencé, la tentative est verrouillée.
- Chronomètre visible. Le temps est **mesuré côté serveur** (début = envoi de la première question, fin = réception de la dernière réponse).
- Une question à la fois, pas de retour en arrière.
- Abandon : si le quiz n'est pas terminé (app fermée…), la tentative est clôturée automatiquement après 15 minutes ou à 23h59 : questions sans réponse = erreurs, temps = temps écoulé jusqu'à la clôture.
- Quiz non joué = 0 point ce jour-là, pas de rattrapage.

## 7. Correction (immédiatement après le quiz)

Pour chaque question : l'énoncé, la réponse choisie, la bonne réponse, une **explication courte** et la **référence de la slide** (cliquable, ouvre la page du PDF).

Après minuit, les joueurs peuvent revoir les quiz passés et leurs corrections dans un historique (sans pouvoir rejouer pour des points).

## 8. Classements

- **Classement du jour** (par matière) : provisoire pendant la journée, définitif à minuit.
- **Classement de saison** (par matière) : cumul des points de la saison en cours.
- **Classement général du groupe** : cumul de toutes les matières.
- Historique des saisons terminées (podium de chaque saison).
- Règles de calcul : `04-regles-scoring.md`.

## 9. Notifications (PWA)

- Rappel quotidien si le quiz n'est pas joué (heure par défaut : 19h, réglable par l'utilisateur).
- Notification quand quelqu'un te dépasse au classement de saison (désactivable).
- Fin de saison : podium.

## 10. Écrans principaux

1. **Accueil** : mes groupes, et pour chaque matière : quiz du jour (à jouer / fait + score), position en saison.
2. **Groupe** : matières, classement général, invitations.
3. **Matière** : quiz du jour, programme (calendrier des slides), classement du jour, classement de saison, documents.
4. **Quiz** : une question par écran, chronomètre, barre de progression.
5. **Résultat + correction**.
6. **Gestion de la matière** (gestionnaire) : documents de cours, annales, réglages de saison, état de génération des questions.
7. **Profil / réglages** : pseudo, notifications.
