# Révis'Arena — application de révision gamifiée

Un quiz quotidien entre amis sur vos cours (10 questions par jour, classements du jour, de la saison et du groupe), plus une **Arène** pour s'affronter en direct.
Le cahier des charges complet est dans [`CLAUDE.md`](CLAUDE.md) et le dossier [`docs/`](docs/).

---

## ⚡ Lancement express sur Onyxia (SSP Cloud)

Si tu travailles dans un service **VS Code d'Onyxia**, un script fait tout (Node.js, dépendances, tables, secret de session, démarrage) :

1. Lance un service VS Code avec la **connexion à PostgreSQL activée** (et le **service IA** si tu veux que les quiz soient écrits par l'IA).
2. Dans son terminal :
   ```bash
   git clone https://github.com/El-Genius-roh-roh/app.git && cd app
   bash lancer-app.sh                        # accès privé (via le proxy VS Code)
   bash lancer-app.sh https://ton-adresse     # ou : accès public (port 3000 ouvert dans Onyxia)
   ```
3. Ouvre l'adresse affichée par le script.

Le script relit `$PGHOST`, `$PGUSER`, `$PGPASSWORD`… fournis par Onyxia, ainsi que `OPENAI_API_KEY` / `OPENAI_BASE_URL` pour l'IA. Il peut être relancé après chaque `git pull` (il réinstalle les dépendances si besoin).

Sur ton propre ordinateur, suis plutôt le guide ci-dessous.

---

## 🚀 Lancer l'application en local

Il faut environ 10 minutes la première fois. Les commandes sont données pour **Windows (PowerShell)** ; l'équivalent macOS/Linux est indiqué quand il diffère.

### 1. Installer les prérequis

| Outil | Version | Windows | macOS | Linux (Debian/Ubuntu) |
|-------|---------|---------|-------|------------------------|
| **Node.js** | 20 ou plus | `winget install OpenJS.NodeJS.LTS` | `brew install node` | `sudo apt install nodejs npm` |
| **PostgreSQL** | 14 ou plus | `winget install PostgreSQL.PostgreSQL.16` | `brew install postgresql@16 && brew services start postgresql@16` | `sudo apt install postgresql` |
| **Git** | — | `winget install Git.Git` | déjà installé | `sudo apt install git` |

> Sous Windows, l'installateur de PostgreSQL demande un **mot de passe pour l'utilisateur `postgres`** : retiens-le, il servira à l'étape 4. Ferme puis rouvre ton terminal après les installations pour que `node` et `npm` soient reconnus.

Vérifie que tout est en place :

```powershell
node -v
npm -v
```

### 2. Récupérer le code

```powershell
git clone https://github.com/El-Genius-roh-roh/app.git
cd app
```

> ⚠️ **Évite de cloner dans un dossier OneDrive / iCloud / Dropbox** : `npm install` crée des milliers de fichiers que le service de synchronisation va essayer d'envoyer. Préfère par exemple `C:\dev\app`.

### 3. Installer les dépendances

```powershell
npm install
```

Le fichier `.npmrc` du projet règle automatiquement le conflit de versions entre `vitest` et `@types/node`.

### 4. Créer la base de données

Crée une base vide nommée `revision` :

```powershell
# Windows : remplace MOT_DE_PASSE par celui choisi à l'installation
$env:PGPASSWORD="MOT_DE_PASSE"; & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "create database revision"
```

```bash
# macOS (Homebrew)
createdb revision
# Linux
sudo -u postgres createdb revision
```

### 5. Configurer les variables d'environnement

Crée un fichier **`.env.local`** à la racine du projet (il est ignoré par Git) :

```ini
DATABASE_URL=postgres://postgres:MOT_DE_PASSE@localhost:5432/revision
SESSION_SECRET=une-longue-phrase-secrete-au-hasard
JOB_SECRET=un-autre-secret
DEMO_MODE=1
NEXT_PUBLIC_APP_NAME=Révis'Arena

# Facultatif : IA qui écrit les quiz (API compatible OpenAI)
# OPENAI_API_KEY=ta-cle
# OPENAI_BASE_URL=https://adresse-du-service/v1
# LLM_MODEL=qwen3-6-35b-moe
```

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Connexion PostgreSQL. Sous Linux avec l'utilisateur système : `postgres:///revision`. |
| `SESSION_SECRET` | Signe les cookies de session. **Obligatoire en production.** |
| `JOB_SECRET` | Protège les tâches planifiées (`/api/jobs/...`). |
| `DEMO_MODE` | `1` = le lien de connexion s'affiche à l'écran (sans e-mail) et des « outils de démo » apparaissent (avancer d'un jour, générer les quiz). ⚠️ Dans ce mode, connaître l'e-mail de quelqu'un suffit pour entrer sur son compte : ne l'expose pas publiquement sans `CODE_ACCES`. |
| `CODE_ACCES` | Optionnel : code à saisir en plus de l'e-mail pour se connecter. Réserve l'app à ceux qui le connaissent. `lancer-app.sh` en génère un automatiquement en accès public. |
| `RESEND_API_KEY` + `MAIL_FROM` | Optionnel : envoi d'un **vrai e-mail** de connexion via [Resend](https://resend.com) (ex. `MAIL_FROM=Révis'Arena <connexion@ton-domaine.fr>`). C'est le mode à utiliser pour un usage réel. Sans eux et hors mode démo, le lien est écrit dans la console du serveur. |
| `NEXT_PUBLIC_APP_NAME` | Nom affiché dans l'application. |
| `OPENAI_API_KEY` + `OPENAI_BASE_URL` | Optionnel : active la génération des quiz **par l'IA**. N'importe quelle API compatible OpenAI convient (service IA d'Onyxia, OpenAI, Mistral, Ollama en local…). La clé reste côté serveur. Sans elles, les questions sont simulées ou passent par le « Chat » (copier-coller). |
| `LLM_MODEL` | Optionnel : nom du modèle (par défaut `qwen3-6-35b-moe`, celui d'Onyxia). |
| `NEXT_PUBLIC_BASE_PATH` | Optionnel : préfixe d'URL si l'app tourne derrière un proxy (ex. `/absproxy/3000` sur Onyxia). |
| `APP_ORIGIN` | Optionnel : nom d'hôte public autorisé quand l'app est servie derrière une adresse externe (rempli automatiquement par `lancer-app.sh`). |

> 💡 Sous Windows, crée ce fichier avec un éditeur (VS Code, ou Bloc-notes en « UTF-8 ») plutôt qu'avec `Set-Content` de PowerShell : ce dernier ajoute un caractère invisible (BOM) en début de fichier, et `DATABASE_URL` n'est alors plus lu.

### 6. Créer les tables

```powershell
npx tsx --env-file=.env.local db/migrate.ts
```

Tu dois voir une ligne `ok` par fichier de `db/migrations/` (`001_init.sql` à `006_avatar.sql` aujourd'hui). La commande peut être relancée sans risque, et **doit l'être après chaque `git pull`** qui ajoute une migration.

### 7. (Recommandé) Charger les données de démo

```powershell
node --env-file=.env.local scripts/seed-arene.mjs
```

Cela crée le groupe **« ENSAI Démo »** (code d'invitation `ENSAI1`), trois matières (Probabilités, Statistique inférentielle, Machine Learning) avec 35 questions, et trois comptes : `alice@demo.fr`, `bob@demo.fr`, `chloe@demo.fr`.

### 8. Démarrer

```powershell
npm run dev
```

Ouvre **http://localhost:3000**. 🎉

---

## 🎮 Prise en main

### Se connecter
1. Sur `/login`, saisis une adresse (par exemple `alice@demo.fr`), et le code d'accès si l'app en demande un.
2. En mode démo, aucun e-mail n'est envoyé : clique directement sur **« Se connecter »**. Avec `RESEND_API_KEY`, ouvre l'e-mail reçu ; sinon, le lien est dans la console du serveur.
3. Au premier login, choisis un pseudo.

Pour simuler plusieurs joueurs sur un même ordinateur, ouvre une **fenêtre de navigation privée** (ou un autre navigateur) et connecte-toi avec un autre e-mail.

### Jouer en Arène (duel en direct)
1. Accueil → **⚔️ Arène**.
2. Choisis un mode (**Quiz Blitz**, **Vrai ou Faux**, **Mix**) et un nombre de manches, puis **Créer une partie**.
3. Partage le **code à 4 lettres** (les autres le saisissent dans « Rejoindre avec un code ») ou clique **+ Ajouter un bot** pour t'entraîner seul.
4. **Lancer la partie** : réponds vite (souris ou touches `1`-`4`). Correction et classement après chaque manche, podium et points de ligue à la fin.

> Seules les parties entre **au moins 2 joueurs humains** comptent pour le classement de l'Arène (Elo calculé entre humains). Une partie seul contre des bots est un entraînement non classé.

> L'Arène n'utilise que les questions des **jours passés**, pour ne jamais dévoiler le quiz du jour. Sur un groupe neuf, joue d'abord un ou deux jours (ou utilise les données de démo).

### Faire le quiz du jour avec son propre cours
1. Crée un groupe, puis une **matière** (date de début, jours par saison, nombre de saisons).
2. Dans la matière, importe un **PDF de cours** (et éventuellement des annales). Pour tester sans PDF sous la main :
   ```powershell
   mkdir storage -Force; npx tsx scripts/make-demo-pdf.ts
   ```
   Cela génère `storage/demo-cours.pdf` et `storage/demo-annale.pdf`.
3. Le cours est découpé automatiquement en jours (programme visible dans la matière).
4. Génère les questions, au choix :
   - **🤖 Questions par l'IA → « ✨ Générer avec l'IA »** : l'IA écrit les quiz à partir des slides (nécessite `OPENAI_API_KEY` et `OPENAI_BASE_URL`) ;
   - **Chat** : copie le prompt proposé dans ChatGPT ou Claude, puis colle sa réponse dans l'application ;
   - **Outils de démo → « Générer (simulé) »** : questions fabriquées sans IA à partir des slides, pour tester ;
   - **Questions** : écris ou corrige des questions à la main (elles sont conservées lors des générations suivantes).
5. Joue le quiz du jour (10 questions, une seule tentative), puis consulte la correction, les classements, le graphique d'évolution et les trophées.
6. **Outils de démo → « Jour suivant »** avance la date **de cette matière** d'un jour pour voir la saison progresser (gel des résultats, nouveau quiz). Chaque matière a sa propre date de démo.

### Jouer à plusieurs sur le même Wi-Fi
```powershell
npm run dev -- -H 0.0.0.0
```
Les autres ouvrent `http://ADRESSE_IP_DE_TON_PC:3000` (adresse visible avec `ipconfig` sous Windows, `ipconfig getifaddr en0` sous macOS). Sous Windows, autorise Node.js dans le pare-feu si la fenêtre s'affiche.

---

## 🧪 Commandes utiles

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de développement (rechargement à chaud) |
| `npm run build` puis `npm start` | Version optimisée (production) |
| `npm test` | Tests unitaires (scoring, quiz, Arène) |
| `npx tsx --env-file=.env.local db/migrate.ts` | Applique les migrations |
| `node --env-file=.env.local scripts/seed-arene.mjs` | Données de démo |

Tâches planifiées (à déclencher par un cron en production, voir `docs/05-architecture-technique.md`) :

```bash
# 00h00 : gel des résultats de la veille + génération des quiz
curl -X POST -H "x-job-secret: $JOB_SECRET" http://localhost:3000/api/jobs/midnight
# toutes les 5 min : clôture des tentatives abandonnées
curl -X POST -H "x-job-secret: $JOB_SECRET" http://localhost:3000/api/jobs/close
```

---

## 🛠️ Dépannage

| Problème | Solution |
|----------|----------|
| `node` / `npm` introuvable | Ferme et rouvre le terminal après l'installation de Node. |
| `npm install` → `ERESOLVE` | Vérifie que le fichier `.npmrc` est présent, ou lance `npm install --legacy-peer-deps`. |
| `client password must be a string` | `DATABASE_URL` n'est pas lu : vérifie que `.env.local` est à la racine et enregistré en UTF-8 **sans BOM**. |
| `password authentication failed` | Mauvais mot de passe dans `DATABASE_URL`. |
| `database "revision" does not exist` | Refais l'étape 4. |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL n'est pas démarré (Windows : service `postgresql-x64-16` ; macOS : `brew services start postgresql@16`). |
| `relation ... does not exist` | Refais l'étape 6 (migrations). |
| Port 3000 déjà utilisé | `npm run dev -- -p 3001` |
| `column ... does not exist` après un `git pull` | Une nouvelle migration est arrivée : refais l'étape 6. |
| « IA non configurée » | Renseigne `OPENAI_API_KEY` et `OPENAI_BASE_URL` dans `.env.local`, puis redémarre `npm run dev`. |
| `IA : pas de réponse après … s` | Le service IA est lent ou indisponible : réessaie, ou utilise le « Chat ». |
| « Pas assez de questions archivées » dans l'Arène | Charge les données de démo (étape 7) ou joue d'abord quelques quiz du jour. |

---

## 🧱 Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL (`pg`) · Vitest · IA via une API compatible OpenAI (`src/lib/ai/llm.ts`).

- `src/app` : pages et routes API
- `src/lib` : logique métier (quiz, scoring, classements, Arène)
- `db/migrations` : schéma SQL
- `scripts` : données de démo et tests de bout en bout
