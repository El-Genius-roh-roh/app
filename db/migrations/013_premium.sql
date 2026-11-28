-- Comptes premium (D42) : flashcards et Arène (duels, jeu de plateau) réservées aux comptes premium.
-- Pas encore de paiement : en démo (DEMO_MODE=1), chacun active ou retire le premium depuis son profil.
SET search_path TO revision_app;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium boolean NOT NULL DEFAULT false;
