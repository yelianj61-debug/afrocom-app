-- ============================================================
-- AJOUTS — Système d'inscription / connexion membres
-- Exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- ── TABLE MEMBRES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  civilite   TEXT NOT NULL,
  nom        TEXT NOT NULL,
  prenom     TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  pays       TEXT NOT NULL,
  telephone  TEXT NOT NULL,
  photo_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_email     ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_email_tel ON members(email, telephone);
CREATE INDEX IF NOT EXISTS idx_members_created   ON members(created_at DESC);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- N'importe qui peut s'inscrire
CREATE POLICY "members_public_insert"
  ON members FOR INSERT
  TO anon
  WITH CHECK (true);

-- Lecture bloquée en direct (passe par SECURITY DEFINER)

-- ── FONCTIONS ──────────────────────────────────────────────

-- Connexion : vérifier email + téléphone et retourner le membre
CREATE OR REPLACE FUNCTION member_login(p_email TEXT, p_telephone TEXT)
RETURNS members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result members;
BEGIN
  SELECT * INTO result
  FROM members
  WHERE lower(trim(email))     = lower(trim(p_email))
    AND trim(telephone)        = trim(p_telephone);
  RETURN result;
END;
$$;

-- Historique des commandes d'un membre (via son téléphone)
CREATE OR REPLACE FUNCTION member_get_orders(p_telephone TEXT)
RETURNS SETOF orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM orders
  WHERE phone = p_telephone
  ORDER BY created_at DESC;
$$;

-- Mise à jour de la photo de profil
CREATE OR REPLACE FUNCTION member_update_photo(p_id UUID, p_photo_url TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE members SET photo_url = p_photo_url WHERE id = p_id;
$$;

-- Admin : voir tous les membres
CREATE OR REPLACE FUNCTION admin_get_all_members()
RETURNS SETOF members
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM members ORDER BY created_at DESC;
$$;

-- ── PERMISSIONS ────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION member_login(TEXT, TEXT)           TO anon;
GRANT EXECUTE ON FUNCTION member_get_orders(TEXT)            TO anon;
GRANT EXECUTE ON FUNCTION member_update_photo(UUID, TEXT)    TO anon;
GRANT EXECUTE ON FUNCTION admin_get_all_members()            TO anon;
