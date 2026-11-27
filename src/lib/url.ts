// Préfixe d'URL optionnel (ex. « /absproxy/3000 » derrière le proxy d'un espace Onyxia / code-server).
// À utiliser pour les liens <a>, fetch() et redirections « bruts » : <Link> et redirect() l'ajoutent déjà.
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const url = (path: string) => BASE + path;
