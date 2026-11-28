-- Activités solo (D37) : chaque session terminée (flashcards, Memory, Arène contre des bots) est enregistrée.
-- Elle rapporte des gemmes solo (SOLO.GEMMES_PAR_SESSION, plafonnées par jour au moment du calcul) qui comptent
-- dans le score de la semaine du groupe. `date` = jour de jeu (heure de Paris, date de démo de la matière s'il y en a une).
SET search_path TO revision_app;

CREATE TABLE IF NOT EXISTS solo_sessions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('flashcards', 'memory', 'arene')),
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_solo_sessions_groupe ON solo_sessions(group_id, date);

-- Jours de visite (succès « fidèle » : connecté N jours d'affilée). Un jour = date de Paris, une ligne par joueur et par jour.
CREATE TABLE IF NOT EXISTS user_activity (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  PRIMARY KEY (user_id, date)
);
