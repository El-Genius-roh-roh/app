SET search_path TO revision_app;
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_day ON attempts(game_day_id);
CREATE INDEX IF NOT EXISTS idx_questions_day ON questions(game_day_id);
