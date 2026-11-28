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
| Q16 | Taille et formats de la photo de profil ? | 15 Mo maximum à l'envoi, JPEG/PNG/WebP ; stockée en 256 × 256 WebP. Le HEIC brut n'est pas lu (les iPhone convertissent en JPEG à l'envoi) |
| Q18 | Le retard d'un rattrapage change-t-il le rang du jour ? | Non : il ne réduit que les gemmes (−10 % par jour) |
| Q19 | Qui compte dans le classement de fin de saison (trophées) ? | Seulement les joueurs qui ont joué au moins un quiz de la saison : un membre inactif ne rapporte pas de trophées aux autres |
| Q20 | Quand les trophées d'une saison sont-ils acquis ? | Dès le lendemain du dernier jour de la saison (pas d'attente de la fin du rattrapage) |
| Q21 | « +20 » : seulement pour le 1er de la semaine ? | Oui, le 1er (ex æquo compris) ; `TROPHEES.SEMAINE_GAINS` est une liste par rang, pour récompenser un podium plus tard. Personne ne gagne une semaine où personne n’a marqué |
| Q22 | Quiz manqués comptés à partir de quand (D36) ? | Depuis l’arrivée du joueur dans le groupe (`group_members.joined_at`), pour les matières qu’il suit, une fois le rattrapage impossible. Remplace Q16 : on perd aussi des trophées sans avoir encore joué la matière |
| Q23 | Plafond des gemmes solo (D37) ? | 5 par session, 15 par jour et par groupe (`SOLO`). Plafond appliqué au calcul : toutes les sessions sont gardées |
| Q24 | Quelles activités solo comptent ? | Flashcards, Memory, Arène contre des bots (au moins une réponse). Pas le jeu de plateau (multijoueur, souvent avec des bots) |
| Q19 | (obsolète depuis D36) | Les trophées ne dépendent plus des saisons ; Q19 et Q20 ne s’appliquent plus |
| Q25 | Notions : IA ou détection simple ? | L’IA si `OPENAI_API_KEY` / `OPENAI_BASE_URL` sont définis, sinon (ou si elle échoue ou ne trouve rien) la détection simple. Toujours relisibles dans le glossaire |
| Q26 | Comment éviter les définitions inventées par l’IA ? | On ne garde une notion que si son terme apparaît (sans accents ni casse) dans le texte de la page citée, avec une définition de 12 à 220 caractères différente du terme |
| Q27 | Une nouvelle extraction écrase-t-elle les corrections ? | Non : elle ne remplace que les notions « ia » / « auto » du document ; les notions écrites ou corrigées à la main restent |
| Q28 | Les notions dévoilent-elles le quiz du jour ? | Non : ce sont les définitions du cours, que les joueurs ont déjà (D13 : on sait à l’avance sur quelles diapos porte un jour). Seules les questions restent limitées aux jours passés |
| Q29 | Memory : notions et questions mélangées ? | Non, une source par partie (notions s’il y en a au moins 4 paires, sinon les QCM) pour que les paires restent du même genre ; les flashcards, elles, mélangent les deux |
| Q30 | Mini-jeu du jour : faut-il retirer les modes illimités de l’Arène ? | Non pour l’instant : l’Arène libre (tous les modes, jeu de plateau) reste sous le mini-jeu du jour (« garde l’accès à l’arène »). À retirer si l’équipe veut que le mini-jeu soit le seul jeu du jour |
| Q31 | Mini-jeu du jour : une seule partie par jour ? | Non, on peut rejouer ; les gemmes solo restent plafonnées (15 par jour et par groupe, D37). Le défi du jour est coché dès la première partie |
