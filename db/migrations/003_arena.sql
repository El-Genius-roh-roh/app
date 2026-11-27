-- Mode « Arène » : duels en direct. Totalement séparé des tentatives et des daily_results (docs/04 inchangé).
SET search_path TO revision_app;

-- Une partie = une ligne ; l'état complet (manches, bonnes réponses, joueurs) est en jsonb,
-- verrouillé par SELECT ... FOR UPDATE à chaque requête. Il n'est jamais renvoyé tel quel au client.
CREATE TABLE IF NOT EXISTS arena_rooms (
  code text PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'lobby',
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_arena_rooms_group ON arena_rooms(group_id, phase);

-- Classement Elo de l'Arène, par groupe.
CREATE TABLE IF NOT EXISTS arena_ratings (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rating numeric NOT NULL DEFAULT 1000,
  parties int NOT NULL DEFAULT 0,
  victoires int NOT NULL DEFAULT 0,
  bonnes int NOT NULL DEFAULT 0,
  reponses int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
