-- Migration : ajouter le champ tiktok_username à la table orders
-- Exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tiktok_username VARCHAR(100);

-- Vérification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
