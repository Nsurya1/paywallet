package com.paywallet.idempotency.domain;

public enum IdempotencyStatus {
    PROCESSING,
    COMPLETED,
    FAILED
}
