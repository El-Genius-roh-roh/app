-- Jeu de plateau : chacun son tour lance le dé et répond à une question du thème (matière) de la case visée.
-- Même principe que arena_rooms : l'état complet (plateau, banque de questions, joueurs) est en jsonb,
-- verrouillé par SELECT ... FOR UPDATE à chaque requête, et jamais renvoyé tel quel au client.
SET search_path TO revision_app;

CREATE TABLE IF NOT EXISTS plateau_rooms (
  code text PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'lobby',
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plateau_rooms_group ON plateau_rooms(group_id, phase);
