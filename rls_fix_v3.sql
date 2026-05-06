-- ============================================================
-- AfroTV v3 — SQL corrigé (sans erreur column role)
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ÉTAPE 1 — Ajouter la colonne role à users (si manquante)
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Donner le rôle admin à ton compte
UPDATE users SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'martialgbesso44@gmail.com' LIMIT 1
);

-- ============================================================
-- ÉTAPE 2 — Table sons : colonne audio_url
-- ============================================================
ALTER TABLE sounds ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- ============================================================
-- ÉTAPE 3 — Vérification : colonne social_links JSONB
-- ============================================================
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS social_links JSONB;

-- ============================================================
-- ÉTAPE 4 — Table récompenses créateurs
-- ============================================================
CREATE TABLE IF NOT EXISTS creator_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  amount_eur NUMERIC(10,2) DEFAULT 0,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÉTAPE 5 — RPCs followers
-- ============================================================
CREATE OR REPLACE FUNCTION increment_followers(target_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE users SET followers_count = COALESCE(followers_count, 0) + 1 WHERE id = target_id;
END;$$;

CREATE OR REPLACE FUNCTION decrement_followers(target_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE users SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0) WHERE id = target_id;
END;$$;

-- ============================================================
-- ÉTAPE 6 — inc_view RPC
-- ============================================================
CREATE OR REPLACE FUNCTION inc_view(vid_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_owner UUID;
BEGIN
  UPDATE videos SET views_count = COALESCE(views_count, 0) + 1 WHERE id = vid_id;
  SELECT user_id INTO v_owner FROM videos WHERE id = vid_id;
  IF v_owner IS NOT NULL THEN
    UPDATE users SET total_views_received = COALESCE(total_views_received, 0) + 1 WHERE id = v_owner;
  END IF;
END;$$;

-- ============================================================
-- ÉTAPE 7 — Trigger likes → total_likes_received
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_likes_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_owner UUID; v_id UUID;
BEGIN
  v_id := COALESCE(NEW.video_id, OLD.video_id);
  SELECT user_id INTO v_owner FROM videos WHERE id = v_id;
  IF v_owner IS NOT NULL THEN
    UPDATE videos
      SET likes_count = (SELECT COUNT(*) FROM likes WHERE video_id = v_id)
    WHERE id = v_id;
    UPDATE users
      SET total_likes_received = (
        SELECT COALESCE(SUM(lk.cnt), 0)
        FROM (
          SELECT COUNT(*) AS cnt FROM likes l
          JOIN videos v ON l.video_id = v.id
          WHERE v.user_id = v_owner AND v.deleted_at IS NULL
        ) lk
      )
    WHERE id = v_owner;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS trigger_likes_stats ON likes;
CREATE TRIGGER trigger_likes_stats
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION fn_update_likes_stats();

-- ============================================================
-- ÉTAPE 8 — Politiques RLS
-- (maintenant que la colonne role existe)
-- ============================================================

-- Vidéos publiques lisibles par tous (fix feed vide)
DROP POLICY IF EXISTS "public_read_videos" ON videos;
CREATE POLICY "public_read_videos" ON videos FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL AND (is_private = false OR is_private IS NULL));

-- Admin peut tout lire/écrire sur users
DROP POLICY IF EXISTS "admin_select_users" ON users;
CREATE POLICY "admin_select_users" ON users FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role IN ('admin','super_admin','moderator'))
  );

-- Admin peut INSERT dans notifications
DROP POLICY IF EXISTS "admin_insert_notifications" ON notifications;
CREATE POLICY "admin_insert_notifications" ON notifications FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role IN ('admin','super_admin','moderator'))
  );

-- Admin peut lire/modifier les demandes de monétisation
DROP POLICY IF EXISTS "admin_all_mono_requests" ON monetization_requests;
CREATE POLICY "admin_all_mono_requests" ON monetization_requests FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role IN ('admin','super_admin','moderator'))
  );

-- Admin peut lire/modifier les retraits
DROP POLICY IF EXISTS "admin_all_withdrawal_requests" ON withdrawal_requests;
CREATE POLICY "admin_all_withdrawal_requests" ON withdrawal_requests FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role IN ('admin','super_admin','moderator'))
  );

-- Admin peut lire/modifier les vérifications
DROP POLICY IF EXISTS "admin_all_verif_requests" ON verification_requests;
CREATE POLICY "admin_all_verif_requests" ON verification_requests FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role IN ('admin','super_admin','moderator'))
  );

-- Admin peut gérer creator_rewards
DROP POLICY IF EXISTS "admin_all_creator_rewards" ON creator_rewards;
CREATE POLICY "admin_all_creator_rewards" ON creator_rewards FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role IN ('admin','super_admin','moderator'))
  );

-- Admin peut gérer les signalements vidéos
DROP POLICY IF EXISTS "admin_all_video_reports" ON video_reports;
CREATE POLICY "admin_all_video_reports" ON video_reports FOR ALL TO authenticated
  USING (
    auth.uid() = reporter_id
    OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role IN ('admin','super_admin','moderator'))
  );

-- ============================================================
-- ÉTAPE 9 — Index de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_videos_is_private ON videos(is_private) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_creator_rewards_user ON creator_rewards(user_id);

-- ============================================================
-- Vérification après exécution :
-- SELECT id, email, role FROM auth.users LIMIT 5;
-- SELECT id, username, role FROM users WHERE role != 'user' LIMIT 5;
-- SELECT audio_url FROM sounds LIMIT 1;
-- ============================================================
