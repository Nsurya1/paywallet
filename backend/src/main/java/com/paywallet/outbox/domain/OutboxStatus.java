package com.paywallet.outbox.domain;

public enum OutboxStatus {
    NEW,
    PENDING,
    SENT,
    PUBLISHED,
    FAILED
}
