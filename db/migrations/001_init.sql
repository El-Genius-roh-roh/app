-- Schéma doc 05, adapté à Postgres simple (auth maison, sans Supabase).
CREATE SCHEMA IF NOT EXISTS revision_app;
SET search_path TO revision_app;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  pseudo text,
  avatar_url text,
  notif_heure int NOT NULL DEFAULT 19,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS magic_links (
  token text PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used bool NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  code_invitation text UNIQUE NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','membre')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  nom text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  date_debut date NOT NULL,
  jours_par_saison int NOT NULL CHECK (jours_par_saison > 0),
  nb_saisons int NOT NULL CHECK (nb_saisons > 0),
  profil_examen jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subject_players (
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  actif bool NOT NULL DEFAULT true,
  PRIMARY KEY (subject_id, user_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  categorie text NOT NULL CHECK (categorie IN ('cours','annale')),
  nom text NOT NULL,
  ordre int NOT NULL DEFAULT 0,
  fichier_path text NOT NULL,
  nb_pages int,
  statut text NOT NULL DEFAULT 'traitement' CHECK (statut IN ('traitement','pret','erreur')),
  erreur text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  numero int NOT NULL,
  texte text,
  image_path text,
  type text,
  chapitre text,
  densite int,
  notions jsonb,
  UNIQUE (document_id, numero)
);

CREATE TABLE IF NOT EXISTS game_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  saison int NOT NULL,
  jour_dans_saison int NOT NULL,
  date date NOT NULL,
  statut_generation text NOT NULL DEFAULT 'attente' CHECK (statut_generation IN ('attente','ok','echec')),
  fige bool NOT NULL DEFAULT false,
  UNIQUE (subject_id, saison, jour_dans_saison)
);

CREATE TABLE IF NOT EXISTS game_day_pages (
  game_day_id uuid REFERENCES game_days(id) ON DELETE CASCADE,
  page_id uuid REFERENCES document_pages(id) ON DELETE CASCADE,
  PRIMARY KEY (game_day_id, page_id)
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  game_day_id uuid NOT NULL REFERENCES game_days(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('new','revision')),
  type text NOT NULL CHECK (type IN ('qcm','vrai_faux')),
  enonce text NOT NULL,
  choix jsonb NOT NULL,
  correct_index int NOT NULL,
  explication text,
  source_pages jsonb,
  notion text,
  verifiee bool NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day_id uuid NOT NULL REFERENCES game_days(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ordre_questions jsonb NOT NULL,
  ordre_choix jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  erreurs int,
  duree_ms int,
  statut text NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','terminee','cloturee')),
  UNIQUE (game_day_id, user_id)
);

CREATE TABLE IF NOT EXISTS attempt_answers (
  attempt_id uuid REFERENCES attempts(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  choix_index int,
  correct bool,
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS daily_results (
  game_day_id uuid REFERENCES game_days(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rang int NOT NULL,
  erreurs int NOT NULL,
  duree_ms int NOT NULL,
  joueurs_battus int NOT NULL,
  points_base int NOT NULL,
  multiplicateur numeric NOT NULL,
  points int NOT NULL,
  provisoire bool NOT NULL DEFAULT true,
  PRIMARY KEY (game_day_id, user_id)
);

CREATE TABLE IF NOT EXISTS ai_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid,
  etape text NOT NULL,
  modele text,
  tokens_in int,
  tokens_out int,
  duree_ms int,
  statut text,
  created_at timestamptz NOT NULL DEFAULT now()
);
