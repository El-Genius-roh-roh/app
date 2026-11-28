-- Défi du jour (D41) : le quiz du jour change de format chaque jour (QCM, Relier, Vrai ou faux).
-- Le format et le tirage (ordre de la réserve de Relier) sont fixés au début de la tentative.
SET search_path TO revision_app;

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'qcm';
ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_format_check;
-- liste complète des formats (D46) : cette migration est rejouée à chaque lancement, elle ne doit pas refuser les jeux ajoutés depuis (015)
ALTER TABLE attempts ADD CONSTRAINT attempts_format_check CHECK (format IN ('qcm', 'memory', 'mort_subite', 'relier', 'vf'));
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS reserve jsonb;
