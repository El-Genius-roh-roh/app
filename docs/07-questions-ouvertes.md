# 07 — Questions ouvertes et valeurs par défaut

Points sans décision explicite. Claude Code applique la **valeur par défaut** en attendant. Quand une décision est prise, elle passe dans `00-historique-decisions.md` et la ligne est barrée ici.

| # | Question | Valeur par défaut appliquée |
|---|----------|-----------------------------|
| ~~Q1~~ | ~~Combien de points pour avoir joué, et par joueur battu ?~~ | **Décidé (D15)** : 10 pts de participation, 10 pts par joueur battu |
| Q2 | Un joueur qui n'a pas joué compte-t-il comme « battu » par ceux qui ont joué ? | Non : seuls les joueurs ayant joué comptent |
| Q3 | Le cours est-il réparti sur toutes les saisons, ou chaque saison reprend-elle tout le cours ? | Réparti sur l'ensemble des jours de toutes les saisons (N × S jours), à la suite |
| Q4 | Joue-t-on aussi le week-end ? | Oui, tous les jours (option « sans week-end » possible plus tard) |
| Q5 | Qui peut créer une matière dans un groupe ? | Les admins du groupe uniquement |
| Q6 | Limite de temps par question ? | Aucune limite par question ; tentative clôturée après 15 min au total |
| Q7 | Comment additionner les matières dont les saisons ne sont pas alignées, pour le classement général ? | Somme de tous les points, « depuis le début » ou « 30 derniers jours » |
| Q8 | Import des slides PowerPoint dès le MVP ? | Non : PDF uniquement au MVP (on exporte ses slides en PDF), .pptx en phase 5 |
| Q9 | Qui paie les appels à l'API IA (modèle économique) ? | Une seule clé API côté serveur, payée par le propriétaire de l'app ; pas de paiement dans le MVP |
| Q10 | Nom de l'application ? | Nom provisoire configurable (`APP_NAME`), à définir |
| Q11 | Un joueur peut-il signaler une question fausse ? | Non (décision D1 : pas de validation humaine). À reconsidérer après les tests réels |
| Q12 | Seuils des ligues | Bronze 0, Argent 100, Or 250, Platine 500, Diamant 800, Maître 1 200 trophées dans le groupe (`LIGUES` dans `src/config/constants.ts`) — à ajuster après quelques semaines de jeu |
| Q13 | « 1er du jour » et « le plus rapide » quand on est seul à jouer ? | Non attribués : il faut au moins 2 joueurs ce jour-là (`TROPHEES.MIN_JOUEURS_DUEL`) |
| Q14 | Peut-on modifier la date de début, le nombre de jours ou de saisons d'une matière existante ? | Non : seul le nom est modifiable (D22). Supprimer et recréer la matière si besoin |
| Q15 | Faut-il garder une trace de qui a modifié une question ? | Non : simple marqueur `manuelle`, pas d'historique |
| Q16 | Un joueur qui rejoint un groupe en cours perd-il des trophées pour les jours manqués avant son arrivée ? | Non : la pénalité d'absence ne s'applique qu'après sa première partie dans la matière |
| Q17 | Que faire si l'IA est indisponible ? | Le générateur simulé prend le relais pour que le quiz du jour existe toujours |
