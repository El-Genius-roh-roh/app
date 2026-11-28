-- Mini-jeu du jour (D40) : le jeu « Relier » rapporte des gemmes solo comme le Memory et les flashcards.
SET search_path TO revision_app;

ALTER TABLE solo_sessions DROP CONSTRAINT IF EXISTS solo_sessions_type_check;
ALTER TABLE solo_sessions ADD CONSTRAINT solo_sessions_type_check CHECK (type IN ('flashcards', 'memory', 'arene', 'relier'));
