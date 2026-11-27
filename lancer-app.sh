#!/bin/bash
# Installe Node.js (si besoin), prépare la base et lance l'application.
#
# Usage :
#   bash lancer-app.sh                       -> accès privé via le proxy VS Code (/absproxy/3000)
#   bash lancer-app.sh https://mon-adresse   -> accès public (port 3000 ouvert dans Onyxia)
set -e
NODE_DIR="$HOME/.local/node-v22.12.0-linux-x64"
if [ ! -x "$NODE_DIR/bin/node" ]; then
  echo "== Installation de Node.js =="
  mkdir -p "$HOME/.local"
  curl -fsSL https://nodejs.org/dist/v22.12.0/node-v22.12.0-linux-x64.tar.xz | tar -xJ -C "$HOME/.local"
fi
export PATH="$NODE_DIR/bin:$PATH"

cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "== Installation des dépendances (quelques minutes) =="
  npm ci
fi

if [ -z "$PGHOST" ]; then
  echo "ERREUR : aucune base PostgreSQL détectée (\$PGHOST est vide)."
  echo "Relancez le service VS Code avec la connexion à PostgreSQL activée."
  exit 1
fi
export DATABASE_URL="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"
echo "== Création des tables =="
npx tsx db/migrate.ts

if [ -n "$1" ]; then
  # Accès public : l'application est servie à la racine de l'adresse donnée.
  ORIGIN="${1#*://}"; ORIGIN="${ORIGIN%%/*}"
  export NEXT_PUBLIC_BASE_PATH=""
  OUVRIR="https://$ORIGIN/"
else
  # Accès privé via le proxy de VS Code.
  ORIGIN="${VSCODE_PROXY_URI#*://}"; ORIGIN="${ORIGIN%%/*}"
  export NEXT_PUBLIC_BASE_PATH=/absproxy/3000
  OUVRIR="https://$ORIGIN/absproxy/3000/"
fi
export APP_ORIGIN="$ORIGIN"
export DEMO_MODE=1

# Secret de session conservé entre deux lancements (sinon tout le monde est déconnecté à chaque redémarrage).
SECRET_FILE="$HOME/.config/app-session-secret"
if [ ! -s "$SECRET_FILE" ]; then
  mkdir -p "$(dirname "$SECRET_FILE")"
  head -c 24 /dev/urandom | base64 > "$SECRET_FILE"
  chmod 600 "$SECRET_FILE"
fi
export SESSION_SECRET="$(cat "$SECRET_FILE")"

# Un changement d'adresse (proxy <-> public) exige de reconstruire le cache de Next.js.
if [ -f .next/.base-path ] && [ "$(cat .next/.base-path)" != "$NEXT_PUBLIC_BASE_PATH" ]; then rm -rf .next; fi
mkdir -p .next && echo -n "$NEXT_PUBLIC_BASE_PATH" > .next/.base-path

echo
echo "=================================================================="
echo " Ouvrez : $OUVRIR"
echo " (Ctrl+C pour arrêter l'application)"
echo "=================================================================="
npm run dev -- -H 0.0.0.0
