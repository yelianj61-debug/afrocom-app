-- ============================================================
-- FAN CLUB – SPIRITUALITÉ AUTREMENT DE DAH GBESSO
-- Tables : fanclub_requests, suggestions, feedbacks
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- ── TABLES ─────────────────────────────────────────────────

-- Demandes d'inscription au Fan Club
CREATE TABLE IF NOT EXISTS fanclub_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  civilite    TEXT NOT NULL CHECK (civilite IN ('Monsieur','Madame','Autre')),
  nom_complet TEXT NOT NULL,
  email       TEXT NOT NULL,
  whatsapp    TEXT NOT NULL,
  telephone   TEXT NOT NULL,
  pays        TEXT NOT NULL,
  ville       TEXT NOT NULL,
  age         INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  profession  TEXT NOT NULL,
  motivation  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fc_email ON fanclub_requests(email);
CREATE INDEX IF NOT EXISTS idx_fc_phone ON fanclub_requests(telephone);
CREATE INDEX IF NOT EXISTS idx_fc_created ON fanclub_requests(created_at DESC);

-- Suggestions publiques
CREATE TABLE IF NOT EXISTS suggestions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom     TEXT NOT NULL,
  pays       TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sug_created ON suggestions(created_at DESC);

-- Appréciations (OUI / NON + message)
CREATE TABLE IF NOT EXISTS feedbacks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appreciation BOOLEAN NOT NULL,
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_created ON feedbacks(created_at DESC);

-- ── RLS ────────────────────────────────────────────────────

ALTER TABLE fanclub_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks        ENABLE ROW LEVEL SECURITY;

-- fanclub_requests : INSERT libre, SELECT bloqué (admin seulement)
CREATE POLICY "fc_public_insert"
  ON fanclub_requests FOR INSERT TO anon WITH CHECK (true);

-- suggestions : INSERT et SELECT publics
CREATE POLICY "sug_public_insert"
  ON suggestions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sug_public_select"
  ON suggestions FOR SELECT TO anon USING (true);

-- feedbacks : INSERT et SELECT publics
CREATE POLICY "feed_public_insert"
  ON feedbacks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "feed_public_select"
  ON feedbacks FOR SELECT TO anon USING (true);

-- ── FONCTIONS SECURITY DEFINER ─────────────────────────────

-- Compter les demandes Fan Club (pour affichage public)
CREATE OR REPLACE FUNCTION fc_count_requests()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM fanclub_requests;
$$;

-- Vérifier si une demande existe déjà (par email ou téléphone)
CREATE OR REPLACE FUNCTION fc_check_duplicate(p_email TEXT, p_telephone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM fanclub_requests
    WHERE lower(trim(email))    = lower(trim(p_email))
       OR trim(telephone)       = trim(p_telephone)
  );
$$;

-- Admin : lire toutes les demandes
CREATE OR REPLACE FUNCTION admin_get_fanclub_requests()
RETURNS SETOF fanclub_requests
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM fanclub_requests ORDER BY created_at DESC;
$$;

-- Admin : supprimer une suggestion
CREATE OR REPLACE FUNCTION admin_delete_suggestion(p_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM suggestions WHERE id = p_id;
$$;

-- Admin : supprimer une appréciation
CREATE OR REPLACE FUNCTION admin_delete_feedback(p_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM feedbacks WHERE id = p_id;
$$;

-- ── GRANTS ─────────────────────────────────────────────────

-- Table-level grants pour l'INSERT direct (suggestions, feedbacks)
GRANT INSERT ON TABLE fanclub_requests TO anon;
GRANT INSERT ON TABLE suggestions      TO anon;
GRANT SELECT ON TABLE suggestions      TO anon;
GRANT INSERT ON TABLE feedbacks        TO anon;
GRANT SELECT ON TABLE feedbacks        TO anon;

-- Fonctions
GRANT EXECUTE ON FUNCTION fc_count_requests()                    TO anon;
GRANT EXECUTE ON FUNCTION fc_check_duplicate(TEXT, TEXT)         TO anon;
GRANT EXECUTE ON FUNCTION admin_get_fanclub_requests()           TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_suggestion(UUID)          TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_feedback(UUID)            TO anon;

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
