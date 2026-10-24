-- ============================================================================
-- PayWallet Schema Migration: V1__init.sql
-- Architecture: High-Throughput Concurrency-Safe Ledger Engine
-- Rules: UUID PKs (except ledger BIGSERIAL), Money in BIGINT minor units,
--        Strict foreign keys, check constraints, and performance indexes.
-- ============================================================================

-- Ensure UUID generation functions are available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. USERS
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_email ON users(email);

-- ----------------------------------------------------------------------------
-- 2. WALLETS
-- ----------------------------------------------------------------------------
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    balance BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_wallets_balance_non_negative CHECK (balance >= 0),
    CONSTRAINT chk_wallets_status CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    CONSTRAINT uq_wallets_user_currency UNIQUE (user_id, currency)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_status ON wallets(status);

-- ----------------------------------------------------------------------------
-- 3. TRANSACTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id VARCHAR(64) NOT NULL,
    from_wallet_id UUID,
    to_wallet_id UUID,
    amount BIGINT NOT NULL,
    currency CHAR(3) NOT NULL,
    type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    failure_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_transactions_reference UNIQUE (reference_id),
    CONSTRAINT fk_transactions_from_wallet FOREIGN KEY (from_wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_to_wallet FOREIGN KEY (to_wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT,
    CONSTRAINT chk_transactions_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_transactions_type CHECK (type IN ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL')),
    CONSTRAINT chk_transactions_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')),
    CONSTRAINT chk_transactions_wallets_distinct CHECK (
        from_wallet_id IS NULL OR to_wallet_id IS NULL OR from_wallet_id <> to_wallet_id
    ),
    CONSTRAINT chk_transactions_at_least_one_wallet CHECK (
        from_wallet_id IS NOT NULL OR to_wallet_id IS NOT NULL
    )
);

CREATE INDEX idx_transactions_from_wallet_created ON transactions(from_wallet_id, created_at DESC);
CREATE INDEX idx_transactions_to_wallet_created ON transactions(to_wallet_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status);

-- ----------------------------------------------------------------------------
-- 4. LEDGER ENTRIES (Immutable, Append-Only Bookkeeping)
-- ----------------------------------------------------------------------------
CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    transaction_id UUID NOT NULL,
    wallet_id UUID NOT NULL,
    direction CHAR(1) NOT NULL,
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ledger_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT,
    CONSTRAINT chk_ledger_direction CHECK (direction IN ('D', 'C')),
    CONSTRAINT chk_ledger_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_ledger_balance_after_non_negative CHECK (balance_after >= 0)
);

CREATE INDEX idx_ledger_wallet_created ON ledger_entries(wallet_id, created_at DESC);
CREATE INDEX idx_ledger_transaction_id ON ledger_entries(transaction_id);

-- ----------------------------------------------------------------------------
-- 5. IDEMPOTENCY KEYS
-- ----------------------------------------------------------------------------
CREATE TABLE idempotency_keys (
    user_id UUID NOT NULL,
    idem_key VARCHAR(128) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
    response_status_code INT,
    response_body JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (user_id, idem_key),
    CONSTRAINT fk_idempotency_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_idempotency_status CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX idx_idempotency_expires_at ON idempotency_keys(expires_at);

-- ----------------------------------------------------------------------------
-- 6. OUTBOX EVENTS (Reliable Transactional Message Dispatch)
-- ----------------------------------------------------------------------------
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_outbox_status CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED'))
);

CREATE INDEX idx_outbox_status_created ON outbox_events(status, created_at ASC);
