SET search_path TO revision_app;
-- D26 : la date de démo commune (« demo_today ») devient une date PAR MATIÈRE.
-- Les matières déjà jouées gardent la date où elles en étaient ; les autres repartent de la vraie date du jour.
-- Idempotent : une fois la clé commune supprimée, ne fait plus rien.
INSERT INTO app_settings(key, value)
SELECT 'demo_today:' || s.id, g.value
  FROM subjects s, app_settings g
 WHERE g.key = 'demo_today'
   AND EXISTS (SELECT 1 FROM attempts a JOIN game_days d ON d.id = a.game_day_id WHERE d.subject_id = s.id)
ON CONFLICT (key) DO NOTHING;
DELETE FROM app_settings WHERE key = 'demo_today';
