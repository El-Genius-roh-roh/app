SET search_path TO revision_app;
-- D29 : rattrapage d'un quiz manqué pendant 3 jours ; chaque jour de retard retire 10 % des gemmes.
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS retard_jours int NOT NULL DEFAULT 0;
ALTER TABLE daily_results ADD COLUMN IF NOT EXISTS retard_jours int NOT NULL DEFAULT 0;
