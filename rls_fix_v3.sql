-- ============================================================
-- AfroTV v3 — Script SQL à exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Table sons : ajouter la colonne audio_url si manquante
ALTER TABLE sounds ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 2. Vérification : ajouter social_links JSONB si manquant
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS social_links JSONB;

-- 3. Table récompenses créateurs
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

-- 4. RPCs pour followers (si non existantes)
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

-- 5. inc_view RPC (mise à jour vues + total_views_received)
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
-- POLITIQUES RLS (Row Level Security)
-- ============================================================

-- 6. Lecture des utilisateurs par l'admin
-- (désactiver RLS sur users OU ajouter une policy admin)
-- Option A — Si vous voulez garder RLS : politique admin
DO $$ BEGIN
  CREATE POLICY "admin_select_users" ON users FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
      OR auth.uid() = id
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. INSERT notifications par l'admin
DO $$ BEGIN
  CREATE POLICY "admin_insert_notifications" ON notifications FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
      OR auth.uid() = user_id
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Lecture des demandes de monétisation par l'admin
DO $$ BEGIN
  CREATE POLICY "admin_all_mono_requests" ON monetization_requests FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9. Lecture des demandes de retrait par l'admin
DO $$ BEGIN
  CREATE POLICY "admin_all_withdrawal_requests" ON withdrawal_requests FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 10. Lecture des demandes de vérification par l'admin
DO $$ BEGIN
  CREATE POLICY "admin_all_verif_requests" ON verification_requests FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 11. Lecture et écriture creator_rewards par l'admin
DO $$ BEGIN
  CREATE POLICY "admin_all_creator_rewards" ON creator_rewards FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
      OR auth.uid() = user_id
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 12. Lecture des signalements vidéos par l'admin
DO $$ BEGIN
  CREATE POLICY "admin_all_video_reports" ON video_reports FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 13. Videos publiques accessibles (fix feed vide si RLS trop strict)
DO $$ BEGIN
  CREATE POLICY "public_read_videos" ON videos FOR SELECT TO anon, authenticated
    USING (deleted_at IS NULL AND (is_private = false OR is_private IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Trigger likes → total_likes_received
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_likes_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_owner UUID; v_id UUID;
BEGIN
  v_id := COALESCE(NEW.video_id, OLD.video_id);
  SELECT user_id INTO v_owner FROM videos WHERE id = v_id;
  IF v_owner IS NOT NULL THEN
    UPDATE videos SET likes_count = (SELECT COUNT(*) FROM likes WHERE video_id = v_id) WHERE id = v_id;
    UPDATE users SET total_likes_received = (
      SELECT COALESCE(SUM(lk.cnt), 0) FROM (
        SELECT COUNT(*) AS cnt FROM likes l
        JOIN videos v ON l.video_id = v.id
        WHERE v.user_id = v_owner AND v.deleted_at IS NULL
      ) lk
    ) WHERE id = v_owner;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS trigger_likes_stats ON likes;
CREATE TRIGGER trigger_likes_stats
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION fn_update_likes_stats();

-- ============================================================
-- Index de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_videos_is_private ON videos(is_private) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_creator_rewards_user ON creator_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_monetized ON users(is_monetized) WHERE deleted_at IS NULL;

-- ============================================================
-- FIN — Vérification :
-- SELECT audio_url FROM sounds LIMIT 1;
-- SELECT id FROM creator_rewards LIMIT 1;
-- SELECT increment_followers, decrement_followers FROM pg_proc WHERE proname LIKE '%followers%';
-- ============================================================
