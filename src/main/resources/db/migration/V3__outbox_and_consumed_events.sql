-- ============================================================================
-- PayWallet Schema Migration: V3__outbox_and_consumed_events.sql
-- Transactional Outbox pattern & Idempotent Kafka Consumer
-- ============================================================================

-- 1. Relax outbox_events status constraint to include 'NEW', 'SENT', 'PUBLISHED', 'FAILED'
ALTER TABLE outbox_events DROP CONSTRAINT IF EXISTS chk_outbox_status;

ALTER TABLE outbox_events ADD CONSTRAINT chk_outbox_status
    CHECK (status IN ('NEW', 'PENDING', 'SENT', 'PUBLISHED', 'FAILED'));

ALTER TABLE outbox_events ALTER COLUMN status SET DEFAULT 'NEW';

-- 2. Create table for idempotent Kafka consumer deduplication
CREATE TABLE IF NOT EXISTS consumed_events (
    event_id UUID PRIMARY KEY,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consumed_events_consumed_at ON consumed_events(consumed_at DESC);
