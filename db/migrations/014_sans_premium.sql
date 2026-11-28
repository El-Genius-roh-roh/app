-- Retour en arrière sur le premium (D42 remplacé par D45) : plus de comptes premium. Les jeux s'ouvrent une fois
-- le défi du jour joué (src/lib/acces.ts).
SET search_path TO revision_app;

ALTER TABLE profiles DROP COLUMN IF EXISTS premium;
