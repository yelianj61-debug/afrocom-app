-- ============================================================
-- AfroTV — Correctifs SQL pour badges Viral et Tendance
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Ajouter les colonnes si elles n'existent pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_likes_received BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_views_received BIGINT DEFAULT 0;

-- 2. Recalculer les totaux existants (migration initiale)
UPDATE users u SET
  total_likes_received = (
    SELECT COALESCE(SUM(v.likes_count), 0)
    FROM videos v
    WHERE v.user_id = u.id AND v.deleted_at IS NULL
  ),
  total_views_received = (
    SELECT COALESCE(SUM(v.views_count), 0)
    FROM videos v
    WHERE v.user_id = u.id AND v.deleted_at IS NULL
  );

-- 3. Fonction inc_view (incrémente vues + total_views_received)
CREATE OR REPLACE FUNCTION inc_view(vid_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner UUID;
BEGIN
  UPDATE videos
    SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = vid_id;

  SELECT user_id INTO v_owner FROM videos WHERE id = vid_id;

  IF v_owner IS NOT NULL THEN
    UPDATE users
      SET total_views_received = COALESCE(total_views_received, 0) + 1
    WHERE id = v_owner;
  END IF;
END;
$$;

-- 4. Fonction de mise à jour des stats de likes
CREATE OR REPLACE FUNCTION fn_update_likes_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner UUID;
  v_id UUID;
BEGIN
  v_id := COALESCE(NEW.video_id, OLD.video_id);

  SELECT user_id INTO v_owner FROM videos WHERE id = v_id;

  IF v_owner IS NOT NULL THEN
    -- Mettre à jour le compteur de likes de la vidéo
    UPDATE videos
      SET likes_count = (SELECT COUNT(*) FROM likes WHERE video_id = v_id)
    WHERE id = v_id;

    -- Mettre à jour le total des likes reçus par le créateur
    UPDATE users
      SET total_likes_received = (
        SELECT COALESCE(SUM(lk.cnt), 0)
        FROM (
          SELECT COUNT(*) AS cnt
          FROM likes l
          JOIN videos v ON l.video_id = v.id
          WHERE v.user_id = v_owner AND v.deleted_at IS NULL
        ) lk
      )
    WHERE id = v_owner;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Supprimer l'ancien trigger si existant, puis recréer
DROP TRIGGER IF EXISTS trigger_likes_stats ON likes;
CREATE TRIGGER trigger_likes_stats
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_likes_stats();

-- 6. Fonction de vérification et attribution du badge Viral
-- (appelée par l'app via checkBadges())
-- Assure que la table user_badges existe avec les bonnes colonnes
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_emoji TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  admin_notified BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, badge_type)
);

-- 7. Assurer que trophy_handovers existe
CREATE TABLE IF NOT EXISTS trophy_handovers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','contacted','delivered')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 8. Vérifier les index pour les performances
CREATE INDEX IF NOT EXISTS idx_likes_video_id ON likes(video_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);

-- 9. Ajouter la colonne sender_id à notifications si manquante
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES users(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES videos(id);

-- ============================================================
-- FIN — Vérification après exécution :
-- SELECT total_likes_received, total_views_received FROM users LIMIT 5;
-- ============================================================
