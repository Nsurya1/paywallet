-- ============================================================================
-- PayWallet Schema Migration: V5__notifications_and_webhooks.sql
-- Webhook subscriptions and resilient outbound delivery audit log
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_url VARCHAR(512) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    secret_key VARCHAR(128) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_sub_user_id ON webhook_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_sub_event_type ON webhook_subscriptions(event_type, is_active);

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES webhook_subscriptions(id) ON DELETE SET NULL,
    event_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    target_url VARCHAR(512) NOT NULL,
    payload JSONB NOT NULL,
    response_status_code INT,
    status VARCHAR(20) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 1,
    duration_ms BIGINT NOT NULL DEFAULT 0,
    error_message TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_webhook_delivery_status CHECK (status IN ('SUCCESS', 'FAILED', 'CIRCUIT_OPEN', 'RETRY_EXHAUSTED'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_delivered_at ON webhook_delivery_logs(delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON webhook_delivery_logs(event_id);
