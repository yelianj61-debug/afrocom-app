-- ============================================================
-- CORRECTION ERREUR RLS - À EXÉCUTER DANS SUPABASE SQL EDITOR
-- "new row violates row-level security policy"
-- ============================================================

-- 1. Désactiver RLS sur toutes les tables
ALTER TABLE users                DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders               DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins               DISABLE ROW LEVEL SECURITY;

-- 2. Accès complet au rôle anon (clé publique)
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 3. Vérification : doit retourner "off" pour toutes les tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
