-- ============================================================================
-- PayWallet Schema Migration: V6__seed_demo_user.sql
-- Seed demonstration user (rahul / Password123!) and initial wallet balance
-- ============================================================================

-- 1. Insert Demo User (rahul)
INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
VALUES (
    'd7560ab4-58ea-4240-97b3-f3e9c16485c5',
    'rahul',
    'rahul@paywallet.com',
    '$2a$12$ItkWmAwB8C6liRo5tlSbYuZQ/lGIuiQW3UJ/oGBhm6MCqeoZy80j6',
    'ROLE_USER',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;

-- 2. Insert Demo User Wallet (INR, ₹1,25,000.50 = 12500050 paise)
INSERT INTO wallets (id, user_id, currency, balance, version, status, created_at, updated_at)
VALUES (
    '3f10b4e4-987e-4620-9187-b473ac770115',
    'd7560ab4-58ea-4240-97b3-f3e9c16485c5',
    'INR',
    12500050,
    0,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (user_id, currency) DO NOTHING;
