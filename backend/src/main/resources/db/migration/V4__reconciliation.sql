-- ============================================================================
-- PayWallet Schema Migration: V4__reconciliation.sql
-- End-of-Day (EOD) Reconciliation & Audit Journal Discrepancy Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS recon_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(40) NOT NULL,
    total_wallets_audited INT NOT NULL DEFAULT 0,
    matched_wallets INT NOT NULL DEFAULT 0,
    discrepancy_count INT NOT NULL DEFAULT 0,
    total_system_balance BIGINT NOT NULL DEFAULT 0,
    total_ledger_credits BIGINT NOT NULL DEFAULT 0,
    total_ledger_debits BIGINT NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    CONSTRAINT chk_recon_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'COMPLETED_WITH_DISCREPANCIES', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_recon_reports_started_at ON recon_reports(started_at DESC);

CREATE TABLE IF NOT EXISTS recon_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recon_report_id UUID NOT NULL REFERENCES recon_reports(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    wallet_balance BIGINT NOT NULL,
    ledger_balance BIGINT NOT NULL,
    difference BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UNRESOLVED',
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_discrepancy_status CHECK (status IN ('UNRESOLVED', 'INVESTIGATING', 'RESOLVED'))
);

CREATE INDEX IF NOT EXISTS idx_recon_discrepancies_report_id ON recon_discrepancies(recon_report_id);
CREATE INDEX IF NOT EXISTS idx_recon_discrepancies_wallet_id ON recon_discrepancies(wallet_id);
