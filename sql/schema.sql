-- ============================================================
-- AfroCoins - Schéma complet Supabase
-- À coller dans Supabase > SQL Editor et exécuter
-- ============================================================

-- ===== CRÉATION DES TABLES =====

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    tiktok_email    VARCHAR NOT NULL UNIQUE,
    tiktok_password VARCHAR NOT NULL,
    tiktok_username VARCHAR NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    coin_amount     INT NOT NULL,
    price           DECIMAL(10,2) NOT NULL,
    payment_status  VARCHAR DEFAULT 'en_attente',
    order_status    VARCHAR DEFAULT 'en cours',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id              SERIAL PRIMARY KEY,
    order_id        INT REFERENCES orders(id) ON DELETE CASCADE,
    payment_method  VARCHAR DEFAULT 'mobile_money',
    transaction_id  VARCHAR,
    status          VARCHAR,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
    id       SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL
);

-- ===== DÉSACTIVER RLS (Row Level Security) =====
-- Nécessaire car on utilise la clé anon sans Supabase Auth

ALTER TABLE users               DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders              DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins              DISABLE ROW LEVEL SECURITY;

-- ===== ACCÈS COMPLET AU RÔLE ANON =====

GRANT ALL ON TABLE users                TO anon;
GRANT ALL ON TABLE orders               TO anon;
GRANT ALL ON TABLE payment_transactions TO anon;
GRANT ALL ON TABLE admins               TO anon;

-- Nécessaire pour que les INSERT (SERIAL) fonctionnent
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ===== ADMIN PAR DÉFAUT =====
INSERT INTO admins (username, password)
VALUES ('admin', 'admin2024')
ON CONFLICT (username) DO NOTHING;
