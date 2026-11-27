SET search_path TO revision_app;
-- Photo de profil : fichier storage/avatars/<id>.webp ; avatar_v = version (null = pas de photo), sert aussi à vider le cache.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_v int;
