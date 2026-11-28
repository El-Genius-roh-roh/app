-- Notions du cours (D39) : paires « concept ↔ définition » tirées des pages de cours, pour les flashcards et le Memory.
-- source : 'ia' (extraites par l'IA), 'auto' (détection simple sans IA), 'manuelle' (écrites ou corrigées par un gestionnaire).
-- Une nouvelle extraction remplace les notions 'ia' / 'auto' d'un document, jamais les notions manuelles.
SET search_path TO revision_app;

CREATE TABLE IF NOT EXISTS notions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  page int,
  terme text NOT NULL,
  definition text NOT NULL,
  source text NOT NULL CHECK (source IN ('ia', 'auto', 'manuelle')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notions_matiere ON notions(subject_id);
