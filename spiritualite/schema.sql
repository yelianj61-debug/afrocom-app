-- ============================================================
-- SPIRITUALITÉ AUTREMENT DE DAH GBESSO ADIHODEGEMABOU
-- Schéma Supabase complet
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Produits (savons, parfums, etc.)
CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url    TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Événements (rencontres, cérémonies, etc.)
CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  conditions    TEXT,
  event_date    DATE NOT NULL,
  image_url     TEXT,
  redirect_link TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Commandes clients
CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name   TEXT NOT NULL,
  unit_price     NUMERIC(10,2) NOT NULL,
  quantity       INTEGER NOT NULL DEFAULT 1
                 CHECK (quantity > 0 AND quantity < 1000),
  total_amount   NUMERIC(10,2) NOT NULL,
  phone          TEXT NOT NULL,
  city           TEXT NOT NULL,
  fedapay_trx_id TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'delivered')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_published
  ON products(is_published) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_events_published
  ON events(is_published) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_events_date
  ON events(event_date ASC);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_product
  ON orders(product_id);

CREATE INDEX IF NOT EXISTS idx_orders_created
  ON orders(created_at DESC);

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;

-- ----------- PRODUCTS -----------

-- Lecture publique des produits publiés uniquement
CREATE POLICY "products_public_read"
  ON products FOR SELECT
  TO anon
  USING (is_published = true);

-- ----------- EVENTS -----------

-- Lecture publique des événements publiés uniquement
CREATE POLICY "events_public_read"
  ON events FOR SELECT
  TO anon
  USING (is_published = true);

-- ----------- ORDERS -----------

-- N'importe qui peut passer une commande
CREATE POLICY "orders_public_insert"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- Les clients ne peuvent pas lire les commandes (données privées)
-- Seules les fonctions SECURITY DEFINER admin peuvent lire

-- ============================================================
-- 4. FONCTIONS ADMIN (SECURITY DEFINER)
-- Ces fonctions s'exécutent avec les droits du propriétaire
-- et contournent les RLS pour les opérations d'administration.
-- ============================================================

-- Lire tous les produits (publiés ou non)
CREATE OR REPLACE FUNCTION admin_get_all_products()
RETURNS SETOF products
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM products ORDER BY created_at DESC;
$$;

-- Lire tous les événements (publiés ou non)
CREATE OR REPLACE FUNCTION admin_get_all_events()
RETURNS SETOF events
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM events ORDER BY event_date ASC;
$$;

-- Lire toutes les commandes
CREATE OR REPLACE FUNCTION admin_get_orders()
RETURNS SETOF orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM orders ORDER BY created_at DESC;
$$;

-- Créer ou modifier un produit
CREATE OR REPLACE FUNCTION admin_upsert_product(
  p_id          UUID,
  p_name        TEXT,
  p_description TEXT,
  p_price       NUMERIC,
  p_image_url   TEXT,
  p_published   BOOLEAN
)
RETURNS products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result products;
BEGIN
  IF p_id IS NULL THEN
    -- Création
    INSERT INTO products (name, description, price, image_url, is_published)
    VALUES (p_name, p_description, p_price, p_image_url, p_published)
    RETURNING * INTO result;
  ELSE
    -- Modification
    UPDATE products
    SET name = p_name,
        description = p_description,
        price = p_price,
        image_url = p_image_url,
        is_published = p_published
    WHERE id = p_id
    RETURNING * INTO result;
  END IF;
  RETURN result;
END;
$$;

-- Créer ou modifier un événement
CREATE OR REPLACE FUNCTION admin_upsert_event(
  p_id           UUID,
  p_title        TEXT,
  p_conditions   TEXT,
  p_event_date   DATE,
  p_image_url    TEXT,
  p_redirect     TEXT,
  p_published    BOOLEAN
)
RETURNS events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result events;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO events (title, conditions, event_date, image_url, redirect_link, is_published)
    VALUES (p_title, p_conditions, p_event_date, p_image_url, p_redirect, p_published)
    RETURNING * INTO result;
  ELSE
    UPDATE events
    SET title = p_title,
        conditions = p_conditions,
        event_date = p_event_date,
        image_url = p_image_url,
        redirect_link = p_redirect,
        is_published = p_published
    WHERE id = p_id
    RETURNING * INTO result;
  END IF;
  RETURN result;
END;
$$;

-- Supprimer un produit
CREATE OR REPLACE FUNCTION admin_delete_product(p_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM products WHERE id = p_id;
$$;

-- Supprimer un événement
CREATE OR REPLACE FUNCTION admin_delete_event(p_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM events WHERE id = p_id;
$$;

-- Publier / dépublier un produit
CREATE OR REPLACE FUNCTION admin_toggle_product(p_id UUID, p_published BOOLEAN)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE products SET is_published = p_published WHERE id = p_id;
$$;

-- Publier / dépublier un événement
CREATE OR REPLACE FUNCTION admin_toggle_event(p_id UUID, p_published BOOLEAN)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE events SET is_published = p_published WHERE id = p_id;
$$;

-- Marquer une commande comme livrée
CREATE OR REPLACE FUNCTION admin_mark_delivered(p_order_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE orders SET status = 'delivered' WHERE id = p_order_id;
$$;

-- ============================================================
-- 5. PERMISSIONS SUR LES FONCTIONS
-- Autoriser le rôle anon à appeler les fonctions admin
-- ============================================================

GRANT EXECUTE ON FUNCTION admin_get_all_products()   TO anon;
GRANT EXECUTE ON FUNCTION admin_get_all_events()     TO anon;
GRANT EXECUTE ON FUNCTION admin_get_orders()         TO anon;
GRANT EXECUTE ON FUNCTION admin_upsert_product(UUID, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION admin_upsert_event(UUID, TEXT, TEXT, DATE, TEXT, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_product(UUID) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_event(UUID)   TO anon;
GRANT EXECUTE ON FUNCTION admin_toggle_product(UUID, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION admin_toggle_event(UUID, BOOLEAN)   TO anon;
GRANT EXECUTE ON FUNCTION admin_mark_delivered(UUID) TO anon;

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
