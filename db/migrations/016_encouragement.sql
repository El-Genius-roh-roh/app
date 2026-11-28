-- Encouragement (D51) : le dernier quart du classement de la saison gagne +20 % de gemmes au jeu du jour.
SET search_path TO revision_app;

ALTER TABLE daily_results ADD COLUMN IF NOT EXISTS encouragement boolean NOT NULL DEFAULT false;
