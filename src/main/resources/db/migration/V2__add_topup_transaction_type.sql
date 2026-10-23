-- ============================================================================
-- PayWallet Schema Migration: V2__add_topup_transaction_type.sql
-- Add 'TOPUP' to allowed transaction types
-- ============================================================================

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transactions_type;

ALTER TABLE transactions ADD CONSTRAINT chk_transactions_type 
    CHECK (type IN ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'TOPUP'));
