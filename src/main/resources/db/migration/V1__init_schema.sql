-- PayWallet Initial Schema Migration Baseline
-- Modular Monolith: auth, wallet, transfer, ledger, idempotency, outbox, notification, recon
CREATE TABLE IF NOT EXISTS schema_initialization_marker (
    id SERIAL PRIMARY KEY,
    initialized_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255) NOT NULL
);

INSERT INTO schema_initialization_marker (description)
VALUES ('PayWallet modular monolith baseline initialized');
