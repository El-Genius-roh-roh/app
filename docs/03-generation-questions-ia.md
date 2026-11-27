# 03 — Génération des questions par l'IA

Décision D1 : **aucune validation humaine**. L'IA est seule responsable de la qualité. Comme une question fausse fausse le classement du jour (les erreurs sont le 1er critère), le pipeline comporte obligatoirement une **passe de vérification automatique**.

Modèle : API Claude (Anthropic), appelée uniquement côté serveur. Le nom du modèle est une variable de configuration.

## Pipeline

```
Import PDF ─► Extraction des pages ─► Analyse du cours ─► Découpage en jours
Import annale ─► Profil d'examen
                                         │
             (chaque jour J-1, par un job planifié)
                                         ▼
        Génération des 6 nouvelles + 4 révision ─► Vérification ─► Stockage
```

## Étape 1 — Extraction des pages

Pour chaque page du PDF :
- le **texte** extrait ;
- une **image** de la page (rendu PNG), car beaucoup de slides sont des schémas ou des images. L'image est envoyée à l'IA (vision) quand la page contient peu de texte.

## Étape 2 — Analyse du cours

Un appel IA par document (ou par lots de pages) produit, pour chaque page :
- `type` : `titre` | `sommaire` | `contenu` | `exercice` | `vide/remerciements`
- `chapitre` : titre de la partie à laquelle la page appartient
- `densite` : poids de contenu de 0 à 5 (0 = aucune notion évaluable)
- `notions` : liste courte des notions évaluables

## Étape 3 — Découpage en jours

- Entrée : toutes les pages de cours (ordre des documents puis ordre des pages), avec leur `densite`, et le nombre total de jours restants à planifier.
- Objectif : des blocs **contigus** de pages avec une **densité totale à peu près égale** par jour.
- Règle : on préfère couper à une frontière de chapitre si l'écart de densité reste < 25 %.
- Les pages de densité 0 sont rattachées au bloc voisin mais ne comptent pas.
- Algorithme : déterministe (pas d'IA). Glouton : cible = densité totale / nombre de jours ; on remplit chaque jour jusqu'à la cible, en ajustant à la frontière de chapitre la plus proche.
- Recalcul (ajout de documents) : seuls les jours **strictement après aujourd'hui** sont redécoupés, sur les pages non encore attribuées à un jour passé.

## Étape 4 — Profil d'examen (annales)

À l'import d'une annale, un appel IA en extrait un **profil d'examen** stocké sur la matière :
- notions et chapitres qui reviennent souvent ;
- type de questions posées (définitions, calculs, mécanismes, cas pratiques…) ;
- niveau d'exigence et pièges fréquents ;
- vocabulaire et formulations typiques du professeur.

S'il y a plusieurs annales, le profil est fusionné. Le profil est injecté dans chaque prompt de génération. Sans annale, la génération fonctionne quand même (niveau « examen universitaire » par défaut).

## Étape 5 — Génération quotidienne

Un job planifié génère le quiz du **lendemain** (J-1, par exemple à 03h00), et la veille du premier jour à la création de la saison. Il génère aussi les jours manquants si un job a échoué.

**6 questions nouvelles** — entrée : texte + images des pages du jour, profil d'examen, liste des énoncés déjà posés dans la matière (pour éviter les doublons).

**4 questions de révision** — entrée : pages de **tous les jours précédents** de la matière (toutes saisons confondues). Ce sont des **questions nouvelles**, jamais des questions déjà posées. Sélection des pages : priorité aux notions les plus anciennes ou jamais révisées, et à celles où le groupe a fait le plus d'erreurs.

### Consignes données à l'IA

- La question doit pouvoir être résolue **uniquement à partir des slides fournies** (ou des slides passées pour la révision).
- **Une seule bonne réponse**, sans ambiguïté. Les distracteurs sont plausibles, mais clairement faux pour quelqu'un qui connaît le cours.
- Interdit : « toutes les réponses », « aucune des réponses », doubles négations, questions-pièges sur des détails insignifiants (numéro de page, mise en forme).
- Réponse lisible rapidement : énoncé court (≤ 200 caractères de préférence), choix courts. On joue sur téléphone, en temps limité.
- Style et niveau alignés sur le profil d'examen.
- Varier les notions : pas deux questions sur la même notion le même jour.
- Mélange : environ 80 % QCM, 20 % vrai/faux.
- Chaque question a une **explication** (1–3 phrases) et la **référence de la slide source**.

### Format de sortie (JSON strict)

```json
{
  "questions": [
    {
      "type": "qcm",
      "kind": "new",
      "statement": "Quel enzyme catalyse ... ?",
      "choices": ["...", "...", "...", "..."],
      "correct_index": 2,
      "explanation": "...",
      "source": { "document_id": "...", "pages": [12] },
      "notion": "glycolyse — étape 3"
    }
  ]
}
```

Pour `vrai_faux` : `choices` = `["Vrai", "Faux"]`.

## Étape 6 — Vérification automatique (obligatoire)

Chaque question générée est soumise à un **second appel IA indépendant** (« correcteur »), qui reçoit les slides sources et la question **sans la bonne réponse**, et doit :
1. répondre lui-même à la question ;
2. dire si la question est ambiguë, hors programme ou factuellement contestable.

Une question est **rejetée** si la réponse du correcteur ≠ `correct_index`, ou si elle est signalée ambiguë ou hors programme. Les questions rejetées sont régénérées (2 tentatives au maximum), puis remplacées par une question d'une autre notion du même jour.

Validations techniques en plus : JSON valide, 4 choix distincts (QCM), `correct_index` dans les bornes, pas de doublon d'énoncé dans la matière.

## Coûts et robustesse

- Les extractions, analyses et profils sont calculés **une fois** et mis en cache en base.
- Un seul jeu de questions par jour et par matière, partagé par tout le groupe.
- Journaliser chaque appel IA (matière, étape, tokens, durée, statut) pour suivre les coûts.
- Si la génération du jour a échoué à 00h00 : nouvelle tentative immédiate. En dernier recours, le quiz du jour est composé de 10 questions de révision.

## Règles de contenu ajoutées après les tests (D17, D18)

- **Hors matière interdit** : aucune question sur l'enseignant, les contacts, l'organisation du cours, les examens, la bibliographie. Le générateur simulé écarte ces slides et ces phrases (`horsMatiere` dans `src/lib/quiz/generate.ts`) ; le prompt du chat le demande explicitement.
- **Exemples du cours** : questions d'application (même méthode, nouvelles valeurs), jamais sur les données de l'exemple. Le générateur simulé ignore les slides d'exemple et les phrases surtout chiffrées.
- **LaTeX** : formules entre `$…$` dans l'énoncé, les choix et l'explication. L'import répare les antislashs non doublés (`fixLatexEscapes`).
- **Réponses complètes** : une réponse trop longue est écartée, jamais tronquée.

## Génération automatique par l'IA d'Onyxia (D25)

- Code : `src/lib/quiz/ai.ts` (orchestration), `src/lib/ai/llm.ts` (appel HTTP compatible OpenAI).
- Même prompt que le copier-coller (`buildChatPrompt`), un quiz par appel, réflexion désactivée (`enable_thinking: false`).
- **Vérification** : un second appel reçoit les questions **sans** les bonnes réponses et répond ; toute question dont la réponse diffère est écartée (puis remplacée par le générateur simulé si besoin).
- Déclenchement : en arrière-plan à l'ouverture de la page d'une matière (3 prochains jours), avant le lancement d'un quiz encore vide, par le job `generate`, et par le bouton « Générer avec l'IA » (option : refaire les quiz pas encore commencés).
- Variables : `OPENAI_API_KEY`, `OPENAI_BASE_URL` (fournies par Onyxia), `LLM_MODEL` (facultatif, défaut `qwen3-6-35b-moe`).
