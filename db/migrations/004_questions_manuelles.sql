SET search_path TO revision_app;
-- Question écrite ou corrigée à la main : la génération (chat ou simulée) la conserve et ne complète que les places libres.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS manuelle bool NOT NULL DEFAULT false;
