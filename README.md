# Révis'Arena — application de révision gamifiée

Un quiz quotidien entre amis sur vos cours (10 questions par jour, classements du jour, de la saison et du groupe), plus une **Arène** pour s'affronter en direct.
Le cahier des charges complet est dans [`CLAUDE.md`](CLAUDE.md) et le dossier [`docs/`](docs/).

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
```

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Connexion PostgreSQL. Sous Linux avec l'utilisateur système : `postgres:///revision`. |
| `SESSION_SECRET` | Signe les cookies de session. **Obligatoire en production.** |
| `JOB_SECRET` | Protège les tâches planifiées (`/api/jobs/...`). |
| `DEMO_MODE` | `1` = la connexion se fait sans e-mail et des « outils de démo » apparaissent (avancer d'un jour, générer les quiz). |
| `NEXT_PUBLIC_APP_NAME` | Nom affiché dans l'application. |
| `NEXT_PUBLIC_BASE_PATH` | Optionnel : préfixe d'URL si l'app tourne derrière un proxy (ex. `/absproxy/3000` sur Onyxia). |

> 💡 Sous Windows, crée ce fichier avec un éditeur (VS Code, ou Bloc-notes en « UTF-8 ») plutôt qu'avec `Set-Content` de PowerShell : ce dernier ajoute un caractère invisible (BOM) en début de fichier, et `DATABASE_URL` n'est alors plus lu.

### 6. Créer les tables

```powershell
npx tsx --env-file=.env.local db/migrate.ts
```

Tu dois voir `ok 001_init.sql`, `ok 002_settings.sql`, `ok 003_arena.sql`. La commande peut être relancée sans risque (elle ne crée que ce qui manque).

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
1. Sur `/login`, saisis une adresse (par exemple `alice@demo.fr`).
2. En mode démo, aucun e-mail n'est envoyé : clique directement sur **« Se connecter »**.
3. Au premier login, choisis un pseudo.

Pour simuler plusieurs joueurs sur un même ordinateur, ouvre une **fenêtre de navigation privée** (ou un autre navigateur) et connecte-toi avec un autre e-mail.

### Jouer en Arène (duel en direct)
1. Accueil → **⚔️ Arène**.
2. Choisis un mode (**Quiz Blitz**, **Vrai ou Faux**, **Mix**) et un nombre de manches, puis **Créer une partie**.
3. Partage le **code à 4 lettres** (les autres le saisissent dans « Rejoindre avec un code ») ou clique **+ Ajouter un bot** pour t'entraîner seul.
4. **Lancer la partie** : réponds vite (souris ou touches `1`-`4`). Correction et classement après chaque manche, podium et points de ligue à la fin.

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
   - **Outils de démo → « Générer (simulé) »** : questions fabriquées automatiquement à partir des slides ;
   - **Chat** : copie le prompt proposé dans ChatGPT ou Claude, puis colle sa réponse dans l'application.
5. Joue le quiz du jour (10 questions, une seule tentative), puis consulte la correction et les classements.
6. **Outils de démo → « Jour suivant »** avance la date d'un jour pour voir la saison progresser (gel des résultats, nouveau quiz).

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
| « Pas assez de questions archivées » dans l'Arène | Charge les données de démo (étape 7) ou joue d'abord quelques quiz du jour. |

---

## 🧱 Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL (`pg`) · Vitest.

- `src/app` : pages et routes API
- `src/lib` : logique métier (quiz, scoring, classements, Arène)
- `db/migrations` : schéma SQL
- `scripts` : données de démo et tests de bout en bout
