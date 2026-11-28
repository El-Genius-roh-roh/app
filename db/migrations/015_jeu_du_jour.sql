-- Jeu du jour (D46) : QCM, Memory, Mort subite, Relier (Vrai ou faux reste lisible pour les anciennes tentatives).
SET search_path TO revision_app;

ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_format_check;
ALTER TABLE attempts ADD CONSTRAINT attempts_format_check CHECK (format IN ('qcm', 'memory', 'mort_subite', 'relier', 'vf'));
-- Memory du jour : paires ratées (le classement se fait au temps)
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS rates int NOT NULL DEFAULT 0;

-- Questions « vérifiées » (D48) : c'était l'inverse de ce qu'il fallait. Les questions de l'IA, validées par le
-- correcteur, étaient marquées non vérifiées, et celles du générateur simulé vérifiées : les flashcards, le Memory et
-- l'Arène tombaient sur les questions approximatives. On corrige une fois les questions existantes (énoncés-types du
-- générateur simulé : « À propos de « … », … » et « Vrai ou faux : « … » : … »).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'migration:015_verifiee') THEN
    UPDATE questions SET verifiee = NOT (enonce LIKE 'À propos de « %' OR enonce LIKE 'Vrai ou faux : « %') WHERE NOT manuelle;
    INSERT INTO app_settings(key, value) VALUES ('migration:015_verifiee', 'ok');
  END IF;
END $$;
